import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { redis } from './redis';
import { SITE_URL } from './notify';

// Publication sur la page Facebook et le compte Instagram professionnel de BeamUp (API Graph de Meta).
// Connexion : un signataire du Safe autorise l'app Meta « BeamUp Publication » depuis /pilotage ;
// BeamUp échange le code contre un jeton longue durée et conserve, CHIFFRÉS dans Redis, les jetons des pages
// (sans expiration lorsqu'ils dérivent d'un jeton utilisateur longue durée). Aucun jeton n'est affiché ni copié.
// Variables : META_APP_ID et META_CONFIG_ID (publics), META_APP_SECRET (secret, Vercel « Sensitive »).

export const GRAPH = 'https://graph.facebook.com/v26.0';
export const META_SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish', 'business_management'];
export const redirectUri = () => `${SITE_URL.replace(/\/$/, '')}/api/admin/meta/callback`;
export const hasMeta = () => Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);

const CONNECTION_KEY = 'beam:v1:meta:connection';
const stateKey = (s: string) => `beam:v1:meta:state:${s}`;

export interface MetaPage { id: string; name: string; token: string; ig: { id: string; username: string } | null }
export interface MetaConnection { pages: MetaPage[]; selected: string; connectedBy: string; at: string }

// ---------------- Chiffrement des jetons (AES-256-GCM, clé dérivée d'ADMIN_SESSION_SECRET) ----------------

const key = () => {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('ADMIN_SESSION_SECRET manquant');
  return createHash('sha256').update(`meta-tokens:${s}`).digest();
};

function seal(data: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(data), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString('base64url')).join('.');
}

function open<T>(sealed: string): T {
  const [iv, tag, body] = sealed.split('.').map((p) => Buffer.from(p, 'base64url'));
  const d = createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(body), d.final()]).toString('utf8')) as T;
}

export async function getConnection(): Promise<MetaConnection | null> {
  const [raw] = await redis([['GET', CONNECTION_KEY]]);
  if (!raw) return null;
  try { return open<MetaConnection>(raw); } catch { return null; }
}

export const saveConnection = (c: MetaConnection) => redis([['SET', CONNECTION_KEY, seal(c)]]);
export const deleteConnection = () => redis([['DEL', CONNECTION_KEY]]);

/** Vue sans jetons, pour l'interface. */
export const publicView = (c: MetaConnection | null) => c && {
  selected: c.selected, connectedBy: c.connectedBy, at: c.at,
  pages: c.pages.map((p) => ({ id: p.id, name: p.name, instagram: p.ig?.username || null })),
};

// ---------------- Connexion (OAuth) ----------------

/** État OAuth à usage unique (10 minutes) : le cookie de session n'est pas renvoyé au retour de Facebook (SameSite=Strict). */
export async function createState(admin: string) {
  const state = randomBytes(24).toString('base64url');
  await redis([['SET', stateKey(state), admin, 'EX', 600]]);
  return state;
}

export async function consumeState(state: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(state)) return null;
  const [admin] = await redis([['GET', stateKey(state)], ['DEL', stateKey(state)]]);
  return admin || null;
}

/** Facebook Login for Business : les autorisations sont définies par une « configuration » (META_CONFIG_ID) ; sinon, liste classique. */
export const dialogUrl = (state: string) => `https://www.facebook.com/v26.0/dialog/oauth?${new URLSearchParams({
  client_id: process.env.META_APP_ID!, redirect_uri: redirectUri(), state, response_type: 'code',
  ...(process.env.META_CONFIG_ID ? { config_id: process.env.META_CONFIG_ID } : { scope: META_SCOPES.join(',') }),
})}`;

async function graph(path: string, params: Record<string, string>, method: 'GET' | 'POST' = 'GET') {
  const url = `${GRAPH}${path}`;
  const res = method === 'GET'
    ? await fetch(`${url}?${new URLSearchParams(params)}`, { cache: 'no-store' })
    : await fetch(url, { method: 'POST', body: new URLSearchParams(params), cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Meta : ${data.error?.message || res.status}`);
  return data;
}

/** Code OAuth → jeton utilisateur longue durée → pages gérées (avec leurs jetons et leur compte Instagram). */
export async function connectWithCode(code: string, admin: string): Promise<MetaConnection> {
  const id = process.env.META_APP_ID!, secret = process.env.META_APP_SECRET!;
  const short = await graph('/oauth/access_token', { client_id: id, client_secret: secret, redirect_uri: redirectUri(), code });
  const long = await graph('/oauth/access_token', { grant_type: 'fb_exchange_token', client_id: id, client_secret: secret, fb_exchange_token: short.access_token });
  const accounts = await graph('/me/accounts', { access_token: long.access_token, fields: 'id,name,access_token,instagram_business_account{id,username}', limit: '50' });
  const pages: MetaPage[] = (accounts.data || []).map((p: any) => ({
    id: p.id, name: p.name, token: p.access_token,
    ig: p.instagram_business_account ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username } : null,
  }));
  if (!pages.length) throw new Error('Aucune page Facebook autorisée. Recommencez en cochant la page BeamUp.');
  const preferred = pages.find((p) => /beam\s*up/i.test(p.name)) || pages[0];
  const connection = { pages, selected: preferred.id, connectedBy: admin, at: new Date().toISOString() };
  await saveConnection(connection);
  return connection;
}

// ---------------- Publication ----------------

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Publie sur la page Facebook : vidéo (si fournie) ou texte (avec lien facultatif). Renvoie l'identifiant du post. */
export async function publishFacebook(page: MetaPage, text: string, opts: { videoUrl?: string; link?: string }) {
  if (opts.videoUrl) {
    const r = await graph(`/${page.id}/videos`, { access_token: page.token, file_url: opts.videoUrl, description: text }, 'POST');
    return `https://www.facebook.com/${page.id}/videos/${r.id}`;
  }
  const r = await graph(`/${page.id}/feed`, { access_token: page.token, message: text, ...(opts.link ? { link: opts.link } : {}) }, 'POST');
  return `https://www.facebook.com/${r.id}`;
}

/** Publie une vidéo en Reel sur Instagram (Instagram n'accepte pas les publications sans image ni vidéo). */
export async function publishInstagramReel(page: MetaPage, caption: string, videoUrl: string) {
  if (!page.ig) throw new Error('Aucun compte Instagram professionnel relié à cette page Facebook.');
  const container = await graph(`/${page.ig.id}/media`, { access_token: page.token, media_type: 'REELS', video_url: videoUrl, caption: caption.slice(0, 2200) }, 'POST');
  // Meta télécharge et traite la vidéo : on attend qu'elle soit prête (quelques secondes à quelques minutes).
  for (let i = 0; i < 48; i++) {
    const s = await graph(`/${container.id}`, { access_token: page.token, fields: 'status_code,status' });
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram a refusé la vidéo : ${s.status || s.status_code}`);
    if (i === 47) throw new Error('Instagram traite encore la vidéo : réessayez dans quelques minutes.');
    await wait(5000);
  }
  const published = await graph(`/${page.ig.id}/media_publish`, { access_token: page.token, creation_id: container.id }, 'POST');
  const info = await graph(`/${published.id}`, { access_token: page.token, fields: 'permalink' }).catch(() => ({}));
  return info.permalink || `https://www.instagram.com/${page.ig.username}/`;
}

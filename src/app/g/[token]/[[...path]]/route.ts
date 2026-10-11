import { redis, hasRedis } from '../../../../lib/redis';
import { readGameToken, gamesOrigin, mainOrigin } from '../../../../lib/games/token';
import { getManifest, isApproved, Manifest } from '../../../../lib/games/store';
import { privateLink } from '../../../../lib/games/pinata';

// Passerelle des jeux, servie UNIQUEMENT sur le domaine des jeux (GAMES_ORIGIN, voir src/middleware.ts).
// Chaque requête : jeton valide → jeu toujours approuvé → fichier du manifeste → flux depuis le stockage privé.
// En-têtes de protection : le jeu ne peut être affiché que dans BeamUp, sans popups, sans service worker,
// sans accès à la caméra, au micro ni aux paiements, et le jeton ne fuit pas vers les sites externes (no-referrer).

export const maxDuration = 300; // gros fichiers (Unity .data) diffusés en flux

const LINK_SECONDS = 3600;
const manifestCache = new Map<string, { m: Manifest; at: number }>();

const notFound = (status = 404) => new Response(status === 403 ? 'Accès refusé' : status === 503 ? 'Indisponible' : 'Introuvable', { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

async function manifestFor(cid: string) {
  const hit = manifestCache.get(cid);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.m;
  const m = await getManifest(cid);
  if (m) manifestCache.set(cid, { m, at: Date.now() });
  return m;
}

/** Lien privé Pinata mis en cache 50 minutes (valable une heure). */
async function linkFor(fileCid: string) {
  const key = `beam:v1:game:link:${fileCid}`;
  const [cached] = await redis([['GET', key]]);
  if (cached) return cached as string;
  const url = await privateLink(fileCid, LINK_SECONDS);
  await redis([['SET', key, url, 'EX', LINK_SECONDS - 600]]);
  return url;
}

async function serve(req: Request, params: Promise<{ token: string; path?: string[] }>) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim().toLowerCase();
  if (!gamesOrigin() || host !== new URL(gamesOrigin()).host) return notFound();
  if (req.headers.get('service-worker')) return notFound(403);

  const { token, path = [] } = await params;
  const cid = readGameToken(token);
  if (!cid) return notFound(403);
  if (!hasRedis()) return notFound(503);
  if (!(await isApproved(cid))) return notFound(403);
  const manifest = await manifestFor(cid);
  if (!manifest) return notFound();

  const wanted = path.map((p) => decodeURIComponent(p)).filter((p) => p && p !== '.' && p !== '..').join('/') || manifest.entry;
  const file = manifest.files[wanted] ?? manifest.files[`${wanted}/index.html`];
  if (!file) return notFound();

  const range = req.headers.get('range');
  const upstream = await fetch(await linkFor(file.cid), { headers: range ? { Range: range } : {}, signal: AbortSignal.timeout(280_000) });
  if (!upstream.ok && upstream.status !== 206) return notFound(502);

  const headers = new Headers({
    'Content-Type': file.type,
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), publickey-credentials-get=()',
    'Accept-Ranges': 'bytes',
  });
  if (file.encoding) headers.set('Content-Encoding', file.encoding);
  for (const h of ['content-length', 'content-range']) {
    const v = upstream.headers.get(h);
    if (v && !file.encoding) headers.set(h, v);
  }
  if (file.type.startsWith('text/html') || file.type.startsWith('image/svg')) {
    headers.set('Content-Security-Policy', [
      `frame-ancestors ${mainOrigin()} ${process.env.GAMES_EXTRA_ANCESTORS || ''}`.trim(),
      'sandbox allow-scripts allow-same-origin allow-pointer-lock allow-modals allow-forms',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '));
  }
  return new Response(req.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers });
}

type Ctx = { params: Promise<{ token: string; path?: string[] }> };
export const GET = (req: Request, ctx: Ctx) => serve(req, ctx.params);
export const HEAD = (req: Request, ctx: Ctx) => serve(req, ctx.params);

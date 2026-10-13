import { NextResponse } from 'next/server';
import { redis, hasRedis, rateLimited } from '../../../../lib/redis';
import { clientIp } from '../../../../lib/security';
import { readGameToken, gamesOrigin } from '../../../../lib/games/token';

// Salles des duels en ligne des jeux publiés sur BeamUp (d'abord Chains & Crowns — Édition Umoja), utilisables par tout jeu.
// La partie passe de navigateur à navigateur (WebRTC). Cette route aide quand le réseau ne le permet pas (limite 2 :
// réseaux mobiles ou d'entreprise très fermés). Réservée aux joueurs qui ont le jeu : chaque appel porte le jeton de
// partie délivré par BeamUp (/g/<jeton>/…), qui prouve l'achat d'un jeu premium.
//  POST { action: 'ice', t }                                → serveurs STUN/TURN pour WebRTC (relais TURN de Cloudflare, 6 h) ;
//  POST { action: 'send', t, room, to: 'A'|'B', msgs: [] }  → secours : dépose des messages dans la boîte de l'autre joueur ;
//  POST { action: 'poll', t, room, me: 'A'|'B', since }     → secours : messages reçus depuis le numéro `since`.
// Variables Vercel : CLOUDFLARE_TURN_KEY_ID et CLOUDFLARE_TURN_API_TOKEN. Sans elles, seulement le STUN public de Cloudflare.
// Une salle est liée au jeu du premier jeton qui l'utilise : un autre jeu ne peut pas y écrire.

const ALLOWED = ['app://chains-and-crowns', 'http://localhost:8766', 'http://127.0.0.1:8766']; // app:// = version Windows ; 8766 = développement de l'édition Umoja
const ROOM_SECONDS = 2 * 3600;
const MAX_MESSAGES = 5000; // par boîte (une partie compte quelques centaines d'actions)
const MAX_BYTES = 4096; // par message
const TURN_SECONDS = 6 * 3600;
const STUN_ONLY = [{ urls: ['stun:stun.cloudflare.com:3478'] }];

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const ok = ALLOWED.includes(origin) || (gamesOrigin() && origin === gamesOrigin());
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : { Vary: 'Origin' };
}
const json = (req: Request, data: unknown, status = 200) => NextResponse.json(data, { status, headers: { ...cors(req), 'Cache-Control': 'no-store' } });

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

/** Accès temporaires au relais TURN de Cloudflare (1 000 Go gratuits par mois ; un duel au tour par tour n'en échange que quelques ko). */
async function iceServers() {
  const id = process.env.CLOUDFLARE_TURN_KEY_ID, token = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!id || !token) return { iceServers: STUN_ONLY, turn: false };
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: TURN_SECONDS }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res?.ok) return { iceServers: STUN_ONLY, turn: false };
  const data = (await res.json()) as { iceServers?: { urls: string | string[]; username?: string; credential?: string }[] };
  // Les navigateurs bloquent le port 53 : on retire ces adresses (recommandation de Cloudflare).
  const servers = (data.iceServers || []).map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }));
  return { iceServers: servers.length ? servers : STUN_ONLY, turn: servers.some((s) => s.username) };
}

const boxKey = (room: string, who: string) => `beam:v1:room:${room}:${who}`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const cid = readGameToken(String(body?.t || ''));
  if (!cid) return json(req, { error: 'Jeton de partie invalide ou expiré : relancez le jeu depuis BeamUp.' }, 401);
  if (!hasRedis()) return json(req, { error: 'Stockage indisponible' }, 503);

  if (body?.action === 'ice') {
    if (await rateLimited(`room-ice:${clientIp(req)}`, 20)) return json(req, { error: 'Trop de demandes, réessayez dans une minute.' }, 429);
    return json(req, await iceServers());
  }

  const room = String(body?.room || '');
  if (!/^[0-9a-f]{32,64}$/.test(room)) return json(req, { error: 'Salle invalide.' }, 400);
  if (await rateLimited(`room:${room}`, 600)) return json(req, { error: 'Trop de messages, ralentissez.' }, 429);
  // la salle appartient au jeu du premier jeton qui l'utilise
  const [, owner] = await redis([['SET', `beam:v1:room:${room}:cid`, cid, 'EX', ROOM_SECONDS, 'NX'], ['GET', `beam:v1:room:${room}:cid`]]);
  if (owner !== cid) return json(req, { error: 'Cette salle appartient à un autre jeu.' }, 403);

  if (body?.action === 'send') {
    const to = String(body?.to || '');
    const msgs: unknown[] = Array.isArray(body?.msgs) ? body.msgs.slice(0, 50) : [];
    if (!/^[AB]$/.test(to) || !msgs.length) return json(req, { error: 'Message invalide.' }, 400);
    const lines = msgs.map((m) => JSON.stringify(m));
    if (lines.some((l) => l.length > MAX_BYTES)) return json(req, { error: 'Message trop long.' }, 413);
    const key = boxKey(room, to);
    const [, , length] = await redis([['RPUSH', key, ...lines], ['EXPIRE', key, ROOM_SECONDS], ['LLEN', key], ['EXPIRE', `beam:v1:room:${room}:cid`, ROOM_SECONDS]]);
    if (Number(length) > MAX_MESSAGES) return json(req, { error: 'Salle pleine.' }, 413);
    return json(req, { ok: true });
  }

  if (body?.action === 'poll') {
    const me = String(body?.me || '');
    const since = Math.max(0, Math.floor(Number(body?.since) || 0));
    if (!/^[AB]$/.test(me)) return json(req, { error: 'Joueur invalide.' }, 400);
    const [items] = await redis([['LRANGE', boxKey(room, me), since, since + 199]]);
    const msgs = (items as string[]).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    return json(req, { msgs, next: since + (items as string[]).length });
  }

  return json(req, { error: 'Action inconnue' }, 400);
}

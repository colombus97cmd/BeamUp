import { createHmac, timingSafeEqual } from 'crypto';

// Jetons d'accès aux jeux, placés dans l'URL du domaine des jeux : /g/<jeton>/index.html.
// Le jeton est délivré par BeamUp après les vérifications (jeu approuvé, et pour un jeu premium :
// achat vérifié sur la blockchain). Il est signé (GAME_TOKEN_SECRET) et expire au bout de 6 heures.

const TTL_MS = 6 * 3600 * 1000;

const secret = () => {
  const s = process.env.GAME_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error('GAME_TOKEN_SECRET manquant (32 caractères minimum)');
  return s;
};
const b64 = (s: string) => Buffer.from(s).toString('base64url');
const mac = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url').slice(0, 32);

export function createGameToken(cid: string): string {
  const payload = b64(JSON.stringify({ c: cid, e: Date.now() + TTL_MS }));
  return `${payload}.${mac(payload)}`;
}

/** CID du manifeste si le jeton est valide et non expiré, sinon null. */
export function readGameToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  try {
    const expected = Buffer.from(mac(payload));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const { c, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof c === 'string' && Number(e) > Date.now() ? c : null;
  } catch {
    return null;
  }
}

/** Domaine séparé qui sert les jeux (jamais celui de BeamUp). Ex. https://beamup-jeux.vercel.app */
export const gamesOrigin = () => (process.env.GAMES_ORIGIN || '').replace(/\/$/, '');
export const mainOrigin = () => (process.env.SITE_URL || 'https://beamup.beautifull-earthcorp.tech').replace(/\/$/, '');

export const playUrl = (cid: string, entry = 'index.html') => `${gamesOrigin()}/g/${createGameToken(cid)}/${entry}`;

import { redis, hasRedis } from '../../../../../lib/redis';
import { readGameToken } from '../../../../../lib/games/token';
import { privateLink } from '../../../../../lib/games/pinata';
import { WINDOWS_KEY } from '../../../../../lib/licence';

// Téléchargement de l'installateur Windows, après vérification de l'achat (jeton délivré par POST /api/games/licence).
// Le fichier privé est relayé en flux depuis Pinata avec son vrai nom (« …Setup-x.y.z.exe ») :
// le lien direct de Pinata le nomme d'après son identifiant, sans extension, et Windows ne sait pas l'ouvrir.

export const maxDuration = 300;

const deny = (status: number, text: string) => new Response(text, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('t') || '';
  const subject = readGameToken(token);
  if (!subject?.startsWith('windows:')) return deny(403, 'Lien expiré : relancez le téléchargement depuis la page Jeux de BeamUp.');
  if (!hasRedis()) return deny(503, 'Indisponible');
  const [raw] = await redis([['GET', WINDOWS_KEY]]);
  const info = raw ? JSON.parse(raw) : null;
  if (!info || `windows:${info.cid}` !== subject) return deny(410, 'Cette version a été remplacée : relancez le téléchargement depuis la page Jeux de BeamUp.');

  const upstream = await fetch(await privateLink(info.cid, 600), { signal: AbortSignal.timeout(280_000) });
  if (!upstream.ok || !upstream.body) return deny(502, 'Téléchargement momentanément indisponible, réessayez.');
  const fileName = String(info.fileName || `Chains-and-Crowns-Setup-${info.version}.exe`).replace(/[^\w.\- ]/g, '_');
  const headers = new Headers({
    'Content-Type': 'application/vnd.microsoft.portable-executable',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new Response(upstream.body, { status: 200, headers });
}

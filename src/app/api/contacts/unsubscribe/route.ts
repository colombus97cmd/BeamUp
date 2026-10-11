import { redis, hasRedis } from '../../../../lib/redis';
import { checkUnsubscribeToken } from '../../../../lib/notify';
import { contactKey, NEWS_SET } from '../../../../lib/contacts';

// Désinscription en un clic depuis un mail (lien signé, aucune connexion requise).
// L'identifiant est une adresse de wallet (acheteur) ou « t:… » (inscrit à un tournoi).

const page = (title: string, text: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
    `<body style="background:#020202;color:#eee;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px">` +
    `<main style="max-width:480px;text-align:center"><h1>${title}</h1><p style="color:#aaa;line-height:1.6">${text}</p><a href="/jeux" style="color:#00f2ff">Retour aux jeux</a></main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );

async function unsubscribe(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || '';
  const token = url.searchParams.get('t') || '';
  let valid = false;
  try { valid = Boolean(id) && checkUnsubscribeToken(id, token); } catch { valid = false; }
  if (!valid) return page('Lien invalide', 'Ce lien de désinscription est incorrect ou incomplet.', 400);
  if (hasRedis()) {
    await redis([
      ['DEL', contactKey(id)],
      ['SREM', NEWS_SET, id],
    ]);
  }
  return page('Désinscription confirmée', 'Vous ne recevrez plus les news ni les annonces de tournois BeamUp. Vos coordonnées ont été supprimées.');
}

export const GET = unsubscribe;
// Désinscription « en un clic » des messageries (en-tête List-Unsubscribe-Post).
export const POST = unsubscribe;

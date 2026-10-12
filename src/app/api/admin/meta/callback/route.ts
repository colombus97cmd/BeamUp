import { consumeState, connectWithCode } from '../../../../../lib/meta';
import { logDecision } from '../../../../../lib/moderationStore';

// Retour de Meta après autorisation. Le cookie de session n'est pas envoyé ici (navigation depuis facebook.com,
// cookie SameSite=Strict) : l'état à usage unique, créé par /connect pour un administrateur, fait foi.
// La page renvoyée ramène ensuite vers /pilotage par un lien interne (le cookie de session est alors renvoyé).

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const page = (title: string, text: string) => new Response(
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{background:#020202;color:#fff;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}main{max-width:460px;text-align:center;line-height:1.6}a{color:#00f2ff}</style></head>
<body><main><h1>${esc(title)}</h1><p>${esc(text)}</p><p><a href="/pilotage">Retour à la page de pilotage</a></p></main></body></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const admin = await consumeState(url.searchParams.get('state') || '');
  if (!admin) return page('Lien expiré', 'Cette autorisation n’est plus valable. Relancez la connexion depuis /pilotage → Promotion.');
  if (url.searchParams.get('error')) return page('Connexion annulée', 'L’autorisation n’a pas été donnée. Vous pouvez recommencer depuis /pilotage → Promotion.');
  try {
    const c = await connectWithCode(url.searchParams.get('code') || '', admin);
    await logDecision({ type: 'meta', action: 'connexion', pages: c.pages.map((p) => p.name), by: admin });
    const p = c.pages.find((x) => x.id === c.selected)!;
    return page('Facebook et Instagram connectés', `Page : ${p.name}${p.ig ? ` · Instagram : @${p.ig.username}` : ' · aucun compte Instagram professionnel relié à cette page'}.`);
  } catch (e) {
    return page('Connexion impossible', (e as Error).message);
  }
}

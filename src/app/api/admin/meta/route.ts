import { NextResponse } from 'next/server';
import { adminIdentity } from '../../../../lib/security';
import { logDecision } from '../../../../lib/moderationStore';
import { getConnection, saveConnection, deleteConnection, publicView, hasMeta, redirectUri, connectWithUserToken } from '../../../../lib/meta';

// État de la connexion Facebook / Instagram (sans jetons) et réglages :
//  GET  → { configured, redirectUri, connection } ;
//  POST { action: 'select', pageId } → page utilisée pour publier ; POST { action: 'disconnect' } → efface les jetons.

export async function GET(req: Request) {
  if (!adminIdentity(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return NextResponse.json({ configured: hasMeta(), redirectUri: redirectUri(), connection: publicView(await getConnection().catch(() => null)) });
}

export async function POST(req: Request) {
  const admin = adminIdentity(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.action === 'disconnect') {
    await deleteConnection();
    await logDecision({ type: 'meta', action: 'déconnexion', by: admin });
    return NextResponse.json({ ok: true });
  }
  if (body?.action === 'token') {
    // Jeton généré dans l'explorateur de l'API Graph : échangé aussitôt, jamais conservé ni journalisé.
    const token = String(body.userToken || '').trim();
    if (!/^[A-Za-z0-9_-]{50,600}$/.test(token)) return NextResponse.json({ error: 'Jeton invalide : copiez le jeton d’accès affiché dans l’explorateur.' }, { status: 400 });
    if (!hasMeta()) return NextResponse.json({ error: 'META_APP_SECRET manquant dans Vercel' }, { status: 503 });
    try {
      const c = await connectWithUserToken(token, admin);
      await logDecision({ type: 'meta', action: 'connexion', pages: c.pages.map((p) => p.name), by: admin });
      return NextResponse.json({ ok: true, connection: publicView(c) });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message.slice(0, 300) }, { status: 502 });
    }
  }
  if (body?.action === 'select') {
    const c = await getConnection();
    if (!c || !c.pages.some((p) => p.id === body.pageId)) return NextResponse.json({ error: 'Page inconnue' }, { status: 404 });
    await saveConnection({ ...c, selected: String(body.pageId) });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

import { NextResponse } from 'next/server';
import { adminIdentity } from '../../../../lib/security';
import { logDecision } from '../../../../lib/moderationStore';
import { getConnection, saveConnection, deleteConnection, publicView, hasMeta, redirectUri } from '../../../../lib/meta';

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
  if (body?.action === 'select') {
    const c = await getConnection();
    if (!c || !c.pages.some((p) => p.id === body.pageId)) return NextResponse.json({ error: 'Page inconnue' }, { status: 404 });
    await saveConnection({ ...c, selected: String(body.pageId) });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

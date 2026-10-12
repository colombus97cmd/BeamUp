import { NextResponse } from 'next/server';
import { adminIdentity } from '../../../../../lib/security';
import { getItem, saveItem } from '../../../../../lib/promotion';
import { logDecision } from '../../../../../lib/moderationStore';
import { getConnection, publishFacebook, publishInstagramReel } from '../../../../../lib/meta';

// Publication d'une proposition de l'agent promotionnel sur Facebook ou Instagram, à la demande d'un signataire du Safe.
//  POST { id, target: 'facebook' | 'instagram' } → lien de la publication.

export const maxDuration = 300; // traitement des Reels par Instagram

export async function POST(req: Request) {
  const admin = adminIdentity(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const target = body?.target;
  if (target !== 'facebook' && target !== 'instagram') return NextResponse.json({ error: 'Réseau inconnu' }, { status: 400 });
  const item = await getItem(String(body?.id || ''));
  if (!item) return NextResponse.json({ error: 'Proposition introuvable' }, { status: 404 });
  if (item.social?.[target]) return NextResponse.json({ error: 'Déjà publié sur ce réseau' }, { status: 409 });
  if (item.status === 'rejeté') return NextResponse.json({ error: 'Proposition écartée' }, { status: 409 });
  if (target === 'instagram' && !item.videoUrl) return NextResponse.json({ error: 'Instagram n’accepte que les publications avec une image ou une vidéo.' }, { status: 400 });
  const c = await getConnection();
  const page = c?.pages.find((p) => p.id === c.selected);
  if (!page) return NextResponse.json({ error: 'Facebook n’est pas connecté (onglet Promotion → Connecter).' }, { status: 409 });

  try {
    const link = target === 'facebook'
      ? await publishFacebook(page, item.text, { videoUrl: item.videoUrl, link: item.kind === 'post' ? item.url : undefined })
      : await publishInstagramReel(page, item.text, item.videoUrl!);
    const fresh = (await getItem(item.id)) || item;
    await saveItem({ ...fresh, status: 'publié', social: { ...(fresh.social || {}), [target]: link }, updatedAt: new Date().toISOString(), updatedBy: admin });
    await logDecision({ type: 'publication', target, id: item.id, title: item.title, by: admin });
    return NextResponse.json({ ok: true, link });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.slice(0, 300) }, { status: 502 });
  }
}

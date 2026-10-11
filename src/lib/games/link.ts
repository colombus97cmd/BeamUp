import { NextResponse } from 'next/server';
import { getManifest, isApproved, getSubmission } from './store';
import { playUrl } from './token';

/** Réponse commune aux jeux gratuits (/api/games/play) et premium (/api/media, après vérification de l'achat). */
export async function gameLink(cid: string) {
  if (!(await isApproved(cid))) {
    const sub = await getSubmission(cid);
    const message = sub?.status === 'rejeté' ? 'Ce jeu n\'a pas été validé par BeamUp.' : 'Ce jeu est en cours de vérification par BeamUp.';
    return NextResponse.json({ error: message, pending: sub?.status !== 'rejeté' }, { status: 423 });
  }
  const manifest = await getManifest(cid);
  if (!manifest) return NextResponse.json({ error: 'Jeu introuvable' }, { status: 404 });
  return NextResponse.json({ url: playUrl(cid, manifest.entry), game: true }, { headers: { 'Cache-Control': 'no-store' } });
}

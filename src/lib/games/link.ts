import { NextResponse } from 'next/server';
import { getManifest, isApproved, getSubmission, currentVersion } from './store';
import { playUrl } from './token';

/**
 * Réponse commune aux jeux gratuits (/api/games/play) et premium (/api/media, après vérification de l'achat).
 * `query` : paramètres ajoutés à l'adresse du jeu (ex. lien de tournoi du joueur).
 */
export async function gameLink(cid: string, query?: Record<string, string>) {
  if (!(await isApproved(cid))) {
    const sub = await getSubmission(cid);
    const message = sub?.status === 'rejeté' ? 'Ce jeu n\'a pas été validé par BeamUp.' : 'Ce jeu est en cours de vérification par BeamUp.';
    return NextResponse.json({ error: message, pending: sub?.status !== 'rejeté' }, { status: 423 });
  }
  const version = await currentVersion(cid);
  const manifest = await getManifest(version);
  if (!manifest) return NextResponse.json({ error: 'Jeu introuvable' }, { status: 404 });
  const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : '';
  return NextResponse.json({ url: playUrl(version, manifest.entry) + qs, game: true }, { headers: { 'Cache-Control': 'no-store' } });
}

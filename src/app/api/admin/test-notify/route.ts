import { NextResponse } from 'next/server';
import { adminIdentity, isCron } from '../../../../lib/security';
import { hasMail, hasDiscord, mailAdmin, postDiscord, SITE_URL } from '../../../../lib/notify';

// Essai des envois depuis la page de pilotage : un mail vers ADMIN_EMAIL et un message dans le salon Discord.

export async function POST(req: Request) {
  if (!adminIdentity(req) && !isCron(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const result: Record<string, string> = {};

  if (!hasMail()) result.mail = 'non configuré';
  else if (!process.env.ADMIN_EMAIL) result.mail = 'ADMIN_EMAIL manquant';
  else {
    try {
      await mailAdmin('[BeamUp] Essai des envois', `Ce mail confirme que BeamUp peut envoyer des messages.\n\nPage de pilotage : ${SITE_URL}/pilotage`);
      result.mail = 'envoyé';
    } catch (e) { result.mail = `échec : ${String((e as Error).message).slice(0, 300)}`; }
  }

  if (!hasDiscord()) result.discord = 'non configuré';
  else {
    try {
      await postDiscord('Essai : BeamUp est bien relié à ce salon. Les annonces de tournois et les nouveautés arriveront ici.');
      result.discord = 'envoyé';
    } catch (e) { result.discord = `échec : ${String((e as Error).message).slice(0, 300)}`; }
  }

  return NextResponse.json(result);
}

import { NextResponse } from 'next/server';
import { hasRedis, rateLimited } from '../../../../lib/redis';
import { clientIp } from '../../../../lib/security';
import { SUPPORTED_CHAIN_IDS } from '../../../../config/contracts';
import { moderateText } from '../../../../lib/moderation';
import { readComments, hide, logDecision } from '../../../../lib/moderationStore';
import { mailAdmin } from '../../../../lib/notify';

// Signalement d'un commentaire par un membre (mécanisme de notification exigé des hébergeurs).
// L'agent réexamine aussitôt le commentaire lu sur la blockchain ; chaque signalement est journalisé
// et transmis à l'administrateur, qui garde le dernier mot.

export async function POST(req: Request) {
  if (!hasRedis()) return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });
  if (await rateLimited(`report:${clientIp(req)}`, 5)) return NextResponse.json({ error: 'Trop de signalements, réessayez dans une minute.' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const chainId = Number(body?.chainId), workId = Number(body?.workId), index = Number(body?.index);
  const motive = String(body?.motive || '').slice(0, 300);
  if (!SUPPORTED_CHAIN_IDS.includes(chainId) || ![workId, index].every((n) => Number.isInteger(n) && n >= 0)) {
    return NextResponse.json({ error: 'Signalement invalide.' }, { status: 400 });
  }

  const [comment] = await readComments(chainId, workId, index, 1).catch(() => []);
  if (!comment) return NextResponse.json({ error: 'Commentaire introuvable.' }, { status: 404 });

  const verdict = await moderateText(comment.text).catch(() => null);
  if (verdict?.decision === 'masquer') await hide(chainId, workId, index, { reason: verdict.reason, by: 'signalement', revealable: !verdict.illegal });
  await logDecision({ type: 'signalement', chainId, workId, index, author: comment.author, text: comment.text, motive, decision: verdict?.decision ?? 'erreur', reason: verdict?.reason ?? '' });
  await mailAdmin(
    `[BeamUp] Signalement — œuvre ${workId}, commentaire ${index}`,
    `Réseau ${chainId}, œuvre ${workId}, commentaire n° ${index}\nAuteur : ${comment.author}\nTexte : ${comment.text}\nMotif du signalement : ${motive || '(aucun)'}\n\nDécision de l'agent : ${verdict?.decision ?? 'erreur'} — ${verdict?.reason ?? ''}`,
  ).catch(() => {});

  return NextResponse.json({ ok: true, hidden: verdict?.decision === 'masquer' });
}

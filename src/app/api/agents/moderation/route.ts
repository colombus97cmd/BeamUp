import { NextResponse } from 'next/server';
import { redis, hasRedis } from '../../../../lib/redis';
import { isCron, isAdmin } from '../../../../lib/security';
import { SUPPORTED_CHAIN_IDS } from '../../../../config/contracts';
import { moderateBatch } from '../../../../lib/moderation';
import { worksCount, commentsCount, readComments, cursorKey, hide, logDecision } from '../../../../lib/moderationStore';
import { mailAdmin } from '../../../../lib/notify';
import { hasClaude } from '../../../../lib/claude';
import { getSettings } from '../../../../lib/settings';

// Agent modérateur — balayage périodique (Vercel Cron, voir vercel.json).
// Lit les nouveaux commentaires sur chaque réseau depuis le dernier passage, les classe selon la charte
// et masque à l'affichage ceux de la catégorie « masquer ». Rien n'est jamais effacé.

export const maxDuration = 60;

const BATCH = 40;          // commentaires par appel à Claude
const MAX_PER_RUN = 400;   // plafond de coût par passage ; le reste attend le passage suivant

export async function GET(req: Request) {
  if (!isCron(req) && !isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!hasRedis() || !hasClaude()) return NextResponse.json({ skipped: 'Redis ou ANTHROPIC_API_KEY manquant' });
  if (!(await getSettings()).moderationAgent) return NextResponse.json({ skipped: 'Agent désactivé (page de pilotage)' });

  let scanned = 0;
  const hiddenNow: string[] = [];

  for (const chainId of SUPPORTED_CHAIN_IDS) {
    let total = 0;
    try { total = await worksCount(chainId); } catch { continue; }
    for (let workId = 0; workId < total && scanned < MAX_PER_RUN; workId++) {
      const [cursorRaw] = await redis([['GET', cursorKey(chainId, workId)]]);
      const cursor = Number(cursorRaw) || 0;
      let count = 0;
      try { count = await commentsCount(chainId, workId); } catch { continue; }
      if (count <= cursor) continue;

      for (let offset = cursor; offset < count && scanned < MAX_PER_RUN; offset += BATCH) {
        const comments = await readComments(chainId, workId, offset, Math.min(BATCH, count - offset));
        const verdicts = await moderateBatch(comments.map((c) => c.text));
        for (let i = 0; i < comments.length; i++) {
          const v = verdicts[i];
          if (v.decision === 'masquer') {
            await hide(chainId, workId, offset + i, { reason: v.reason, by: 'agent' });
            hiddenNow.push(`réseau ${chainId}, œuvre ${workId}, n° ${offset + i} : « ${comments[i].text.slice(0, 120)} » — ${v.reason}`);
          }
          if (v.decision !== 'ok') {
            await logDecision({ type: 'agent', chainId, workId, index: offset + i, author: comments[i].author, text: comments[i].text, decision: v.decision, reason: v.reason });
          }
        }
        scanned += comments.length;
        await redis([['SET', cursorKey(chainId, workId), offset + comments.length]]);
      }
    }
  }

  if (hiddenNow.length) {
    await mailAdmin(
      `[BeamUp] Modération : ${hiddenNow.length} commentaire(s) masqué(s)`,
      `${hiddenNow.join('\n')}\n\nPour rétablir un commentaire : POST /api/moderation/admin { "action": "unhide", ... }`,
    ).catch(() => {});
  }
  return NextResponse.json({ scanned, hidden: hiddenNow.length });
}

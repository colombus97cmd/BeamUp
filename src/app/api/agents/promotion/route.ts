import { NextResponse } from 'next/server';
import { hasRedis } from '../../../../lib/redis';
import { isCron, isAdmin } from '../../../../lib/security';
import { hasClaude } from '../../../../lib/claude';
import { getSettings } from '../../../../lib/settings';
import { collectKpis } from '../../../../lib/kpis';
import { runPromotionAgent, saveItem, pruneItems } from '../../../../lib/promotion';
import { postDiscord, mailAdmin, SITE_URL } from '../../../../lib/notify';

// Agent promotionnel — chaque semaine (Vercel Cron, voir vercel.json) ou à la demande depuis /pilotage.
// Il prépare des propositions ; seuls les posts Discord peuvent partir sans validation, et seulement
// si « publication automatique Discord » est activée sur la page de pilotage.

export const maxDuration = 300; // recherche web + rédaction : plusieurs minutes possibles

export async function GET(req: Request) {
  if (!isCron(req) && !isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!hasRedis() || !hasClaude()) return NextResponse.json({ skipped: 'Redis ou ANTHROPIC_API_KEY manquant' });
  const settings = await getSettings();
  if (!settings.promotionAgent) return NextResponse.json({ skipped: 'Agent désactivé (page de pilotage)' });

  await pruneItems();
  const kpis = await collectKpis();
  const { analysis, items } = await runPromotionAgent(kpis);

  let autoPublished = 0;
  if (settings.promoAutoDiscord) {
    for (const item of items.filter((i) => i.kind === 'post' && i.channel === 'discord')) {
      if (await postDiscord(item.text).catch(() => false)) {
        await saveItem({ ...item, status: 'publié', updatedAt: new Date().toISOString(), updatedBy: 'agent' });
        autoPublished++;
      }
    }
  }

  const count = (k: string) => items.filter((i) => i.kind === k).length;
  await mailAdmin(
    '[BeamUp] Propositions de l\'agent promotionnel',
    `${analysis}\n\nPropositions : ${count('post')} posts (${autoPublished} publiés automatiquement sur Discord), ${count('newsletter')} newsletter, ${count('outreach')} cibles de démarchage, ${count('event')} événements, ${count('decision')} décisions.\n\nÀ valider sur ${SITE_URL}/pilotage`,
  ).catch(() => {});

  return NextResponse.json({ items: items.length, autoPublished });
}

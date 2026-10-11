import { NextResponse } from 'next/server';
import { redis, hasRedis } from '../../../../lib/redis';
import { adminIdentity } from '../../../../lib/security';
import { hasClaude } from '../../../../lib/claude';
import { hasMail, hasDiscord } from '../../../../lib/notify';
import { gameProducts } from '../../../../lib/games';
import { getSettings } from '../../../../lib/settings';
import { collectKpis } from '../../../../lib/kpis';
import { listItems, PROMO_REPORTS_KEY } from '../../../../lib/promotion';
import { currentTournament, sponsorPrizes, playersKey, REPORTS_KEY } from '../../../../lib/tournaments';
import { LOG_KEY } from '../../../../lib/moderationStore';

// Tout ce que la page de pilotage affiche, en un appel. Réservé aux signataires du Safe.

export const maxDuration = 60;

export async function GET(req: Request) {
  const admin = adminIdentity(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const readiness = {
    redis: hasRedis(),
    claude: hasClaude(),
    mail: hasMail(),
    discord: hasDiscord(),
    cron: Boolean(process.env.CRON_SECRET),
    unsubscribe: Boolean(process.env.UNSUBSCRIBE_SECRET),
    gameProducts: gameProducts().length,
  };
  if (!readiness.redis) return NextResponse.json({ admin, readiness });

  const parse = (rows: string[] | null) => (rows || []).map((r) => JSON.parse(r));
  const [settings, kpis, tournament, prizes, promoItems, [tReports, pReports, modLog]] = await Promise.all([
    getSettings(), collectKpis().catch(() => null), currentTournament(), sponsorPrizes(), listItems(),
    redis([['LRANGE', REPORTS_KEY, 0, 4], ['LRANGE', PROMO_REPORTS_KEY, 0, 4], ['LRANGE', LOG_KEY, 0, 49]]),
  ]);
  const registered = tournament ? Number((await redis([['SCARD', playersKey(tournament.id)]]))[0]) || 0 : 0;

  return NextResponse.json({
    admin, readiness, settings, kpis, prizes,
    tournament: tournament ? { ...tournament, registered } : null,
    tournamentReports: parse(tReports),
    promoItems,
    promoReports: parse(pReports),
    moderationLog: parse(modLog),
  });
}

import { redis } from './redis';
import { SUPPORTED_CHAIN_IDS, getChainName } from '../config/contracts';
import { worksCount } from './moderationStore';
import { salesByProduct } from './games';
import { NEWS_SET } from './contacts';

// Indicateurs de BeamUp, pour la page de pilotage et l'agent promotionnel.

export async function collectKpis() {
  const works = await Promise.all(SUPPORTED_CHAIN_IDS.map(async (c) => {
    try { return { chain: getChainName(c), works: await worksCount(c) }; } catch { return { chain: getChainName(c), works: null }; }
  }));

  const statsRows = await redis(SUPPORTED_CHAIN_IDS.map((c) => ['HGETALL', `beam:v1:stats:${c}`]));
  const totals = { views: 0, completed: 0 };
  for (const flat of statsRows) {
    for (let i = 0; flat && i < flat.length; i += 2) {
      const field = String(flat[i]).split(':')[1];
      if (field === 'views') totals.views += Number(flat[i + 1]) || 0;
      if (field === 'completed') totals.completed += Number(flat[i + 1]) || 0;
    }
  }

  const [newsContacts] = await redis([['SCARD', NEWS_SET]]);
  const gameSales = await salesByProduct();

  return {
    date: new Date().toISOString().slice(0, 10),
    worksByChain: works,
    totalWorks: works.reduce((s, w) => s + (w.works || 0), 0),
    totalViews: totals.views,
    totalCompletedReads: totals.completed,
    newsContacts: Number(newsContacts) || 0,
    gameSales,
  };
}

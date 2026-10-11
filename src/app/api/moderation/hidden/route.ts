import { NextResponse } from 'next/server';
import { hasRedis } from '../../../../lib/redis';
import { SUPPORTED_CHAIN_IDS } from '../../../../config/contracts';
import { hiddenComments } from '../../../../lib/moderationStore';

// Commentaires masqués d'une œuvre (index → raison et possibilité de consulter l'original), pour l'affichage.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chainId = Number(url.searchParams.get('chainId'));
  const workId = Number(url.searchParams.get('workId'));
  if (!hasRedis() || !SUPPORTED_CHAIN_IDS.includes(chainId) || !Number.isInteger(workId) || workId < 0) return NextResponse.json({ hidden: {} });
  try {
    const hidden = await hiddenComments(chainId, workId);
    return NextResponse.json({ hidden: Object.fromEntries(Object.entries(hidden).map(([i, h]) => [i, { reason: h.reason, revealable: h.revealable === true }])) });
  } catch {
    return NextResponse.json({ hidden: {} });
  }
}

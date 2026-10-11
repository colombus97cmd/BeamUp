import { NextResponse } from 'next/server';
import BeamUpABI from '../../../../contracts/BeamUpV3.json';
import { CONTRACT_ADDRESSES, SUPPORTED_CHAIN_IDS } from '../../../../config/contracts';
import { getServerClient } from '../../../../lib/rpc';
import { hasRedis } from '../../../../lib/redis';
import { getFormat } from '../../../../config/formats';
import { gameLink } from '../../../../lib/games/link';
import { gamesOrigin } from '../../../../lib/games/token';

// Lien de jeu pour une œuvre « Jeu » GRATUITE (les jeux premium passent par /api/media, qui vérifie l'achat).
// Le jeu doit avoir été approuvé par un signataire du Safe.

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const chainId = Number(body?.chainId), workId = Number(body?.workId);
  if (!SUPPORTED_CHAIN_IDS.includes(chainId) || !Number.isInteger(workId) || workId < 0) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  if (!hasRedis() || !gamesOrigin()) return NextResponse.json({ error: 'Jeux indisponibles pour le moment' }, { status: 503 });

  let work: any;
  try {
    work = await getServerClient(chainId).readContract({ address: CONTRACT_ADDRESSES[chainId], abi: BeamUpABI as any, functionName: 'getWork', args: [BigInt(workId)] });
  } catch {
    return NextResponse.json({ error: 'Œuvre introuvable' }, { status: 404 });
  }
  if (getFormat(work.category).kind !== 'game') return NextResponse.json({ error: 'Cette œuvre n\'est pas un jeu' }, { status: 400 });
  if (work.isPremium) return NextResponse.json({ error: 'Jeu premium : ouvrez-le avec votre wallet' }, { status: 403 });
  return gameLink(work.ipfsCID);
}

import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { redis, hasRedis } from '../../../../lib/redis';
import { adminIdentity } from '../../../../lib/security';
import { logDecision } from '../../../../lib/moderationStore';
import { PROMO_OPTOUT_KEY } from '../../../../lib/promotion';

// Créateurs qui refusent d'être mis en avant par l'agent promotionnel (demande reçue par mail, voir /conditions).
//  GET → { optout: string[] } ; POST { address, refuse: boolean } → ajoute ou retire le wallet de la liste.

export async function GET(req: Request) {
  if (!adminIdentity(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!hasRedis()) return NextResponse.json({ optout: [] });
  const [list] = await redis([['SMEMBERS', PROMO_OPTOUT_KEY]]);
  return NextResponse.json({ optout: list || [] });
}

export async function POST(req: Request) {
  const admin = adminIdentity(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const address = String(body?.address || '').trim().toLowerCase();
  if (!isAddress(address)) return NextResponse.json({ error: 'Adresse de wallet invalide' }, { status: 400 });
  await redis([[body.refuse === false ? 'SREM' : 'SADD', PROMO_OPTOUT_KEY, address]]);
  await logDecision({ type: 'promotion', action: body.refuse === false ? 'accord de promotion' : 'refus de promotion', creator: address, by: admin });
  return NextResponse.json({ ok: true });
}

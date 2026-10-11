import { NextResponse } from 'next/server';
import { redis, hasRedis } from '../../../../lib/redis';
import { isAdmin, adminIdentity } from '../../../../lib/security';
import { SUPPORTED_CHAIN_IDS } from '../../../../config/contracts';
import { hide, unhide, logDecision, LOG_KEY } from '../../../../lib/moderationStore';

// Administration de la modération (en-tête x-admin-secret) :
//  GET  → les 100 dernières décisions du journal ;
//  POST { action: 'hide' | 'unhide', chainId, workId, index, reason, illegal? } (illegal : texte original non consultable) → l'administrateur a le dernier mot.

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!hasRedis()) return NextResponse.json({ log: [] });
  const [rows] = await redis([['LRANGE', LOG_KEY, 0, 99]]);
  return NextResponse.json({ log: (rows || []).map((r: string) => JSON.parse(r)) });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const chainId = Number(body?.chainId), workId = Number(body?.workId), index = Number(body?.index);
  if (!SUPPORTED_CHAIN_IDS.includes(chainId) || ![workId, index].every((n) => Number.isInteger(n) && n >= 0)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }
  if (body.action === 'hide') await hide(chainId, workId, index, { reason: String(body.reason || 'Contraire à la charte'), by: 'admin', revealable: body.illegal !== true });
  else if (body.action === 'unhide') await unhide(chainId, workId, index);
  else return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  await logDecision({ type: 'admin', action: body.action, chainId, workId, index, reason: body.reason || '', by: adminIdentity(req) });
  return NextResponse.json({ ok: true });
}

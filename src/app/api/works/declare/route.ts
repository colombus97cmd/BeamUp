import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { redis, hasRedis, rateLimited } from '../../../../lib/redis';
import { clientIp, adminIdentity } from '../../../../lib/security';
import { CREATOR_TERMS_VERSION } from '../../../../lib/workInfo';

// Déclaration faite par le créateur à la publication (avant la transaction) :
// acceptation des conditions des créateurs et adhésion éventuelle à la Sacem (ou à une autre société de gestion collective).
// Une œuvre d'un membre de la Sacem diffusée sur BeamUp demande une autorisation de la Sacem : l'administrateur la voit dans /pilotage.
//  POST { cid, title, format, address, sacem: boolean, terms: true } (public, limité) ;
//  GET  → déclarations récentes (administrateur).

const LIST = 'beam:v1:work:declarations';
const key = (cid: string) => `beam:v1:work:decl:${cid}`;

export async function POST(req: Request) {
  if (!hasRedis()) return NextResponse.json({ ok: false });
  if (await rateLimited(`work-declare:${clientIp(req)}`, 20, 3600)) return NextResponse.json({ error: 'Trop de déclarations' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const cid = String(body?.cid || '');
  if (!/^[a-zA-Z0-9]{20,100}$/.test(cid) || !isAddress(String(body?.address || ''))) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  if (body?.terms !== true) return NextResponse.json({ error: 'Les conditions des créateurs doivent être acceptées.' }, { status: 400 });
  const decl = {
    cid, title: String(body.title || '').slice(0, 120), format: String(body.format || '').slice(0, 40),
    creator: String(body.address).toLowerCase(), sacem: body.sacem === true, terms: CREATOR_TERMS_VERSION, at: new Date().toISOString(),
  };
  // La première déclaration d'un CID fait foi.
  const [created] = await redis([['SET', key(cid), JSON.stringify(decl), 'NX']]);
  if (created === 'OK') await redis([['LPUSH', LIST, cid], ['LTRIM', LIST, 0, 999]]);
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  if (!adminIdentity(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!hasRedis()) return NextResponse.json({ declarations: [] });
  const [cids] = await redis([['LRANGE', LIST, 0, 199]]);
  const rows = cids?.length ? await redis((cids as string[]).map((c) => ['GET', key(c)])) : [];
  return NextResponse.json({ declarations: rows.filter(Boolean).map((r: string) => JSON.parse(r)) });
}

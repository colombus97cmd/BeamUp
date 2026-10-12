import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { redis, hasRedis, rateLimited } from '../../../../lib/redis';
import { clientIp } from '../../../../lib/security';
import { getServerClient } from '../../../../lib/rpc';
import BeamUpABI from '../../../../contracts/BeamUpV3.json';
import { CONTRACT_ADDRESSES, SUPPORTED_CHAIN_IDS } from '../../../../config/contracts';
import { checkLink, workLinksMessage, MAX_LINKS, type WorkLink } from '../../../../lib/workInfo';

// Liens externes d'une œuvre (écoute, achat ailleurs) :
//  GET  ?cids=a,b,c → { links: { [cid]: WorkLink[] } } (public) ;
//  POST { chainId, workId, links: string[], address, issuedAt, signature } → réservé au créateur de l'œuvre (vérifié sur la blockchain).

const key = (cid: string) => `beam:v1:work:links:${cid}`;
const CID = /^[a-zA-Z0-9]{20,100}$/;

export async function GET(req: Request) {
  if (!hasRedis()) return NextResponse.json({ links: {} });
  const cids = (new URL(req.url).searchParams.get('cids') || '').split(',').filter((c) => CID.test(c)).slice(0, 100);
  if (!cids.length) return NextResponse.json({ links: {} });
  const rows = await redis(cids.map((c) => ['GET', key(c)]));
  const links = Object.fromEntries(cids.map((c, i) => [c, rows[i] ? JSON.parse(rows[i]) : []]).filter(([, l]) => (l as WorkLink[]).length));
  return NextResponse.json({ links }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } });
}

export async function POST(req: Request) {
  if (!hasRedis()) return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });
  if (await rateLimited(`work-links:${clientIp(req)}`, 10)) return NextResponse.json({ error: 'Trop de tentatives, réessayez dans une minute.' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const chainId = Number(body?.chainId), workId = Number(body?.workId), issuedAt = Number(body?.issuedAt);
  const address = String(body?.address || '');
  if (!SUPPORTED_CHAIN_IDS.includes(chainId) || !Number.isInteger(workId) || workId < 0 || !isAddress(address)) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 10 * 60 * 1000) return NextResponse.json({ error: 'Signature expirée, réessayez.' }, { status: 401 });

  const client = getServerClient(chainId);
  const work: any = await client.readContract({ address: CONTRACT_ADDRESSES[chainId], abi: BeamUpABI as any, functionName: 'getWork', args: [BigInt(workId)] }).catch(() => null);
  if (!work) return NextResponse.json({ error: 'Œuvre introuvable' }, { status: 404 });
  if (String(work.creator).toLowerCase() !== address.toLowerCase()) return NextResponse.json({ error: 'Seul le créateur de l\'œuvre peut modifier ses liens.' }, { status: 403 });
  const valid = await client.verifyMessage({ address: address as `0x${string}`, message: workLinksMessage(address, work.ipfsCID, issuedAt), signature: String(body?.signature || '') as `0x${string}` }).catch(() => false);
  if (!valid) return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });

  const raw: string[] = (Array.isArray(body?.links) ? body.links : []).map(String).filter((s: string) => s.trim());
  const links = raw.map(checkLink);
  const bad = raw.filter((_, i) => !links[i]);
  if (bad.length) return NextResponse.json({ error: `Lien non accepté (https et site connu uniquement) : ${bad[0].slice(0, 80)}` }, { status: 400 });
  const clean = (links as WorkLink[]).slice(0, MAX_LINKS);
  await redis([clean.length ? ['SET', key(work.ipfsCID), JSON.stringify(clean)] : ['DEL', key(work.ipfsCID)]]);
  return NextResponse.json({ ok: true, links: clean });
}

import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getServerClient } from '../../../lib/rpc';
import { bsc, polygon, mainnet, arbitrum } from 'viem/chains';
import BeamUpABI from '../../../contracts/BeamUpV3.json';
import { CONTRACT_ADDRESSES } from '../../../config/contracts';
import { buildMediaSessionMessage, SESSION_MAX_AGE_MS } from '../../../services/mediaAccess';
import { getFormat } from '../../../config/formats';
import { gameLink } from '../../../lib/games/link';

// Délivre un lien de lecture temporaire pour une œuvre premium, uniquement si le wallet
// (prouvé par signature) détient le NFT d'accès ou est le créateur. Vérification on-chain.
const CHAINS = { 56: bsc, 137: polygon, 1: mainnet, 42161: arbitrum } as const;
const LINK_SECONDS = 4 * 60 * 60; // assez long pour un court métrage
const PUBLIC_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
  const { chainId, workId, address, timestamp, signature } = body;
  const chain = CHAINS[Number(chainId) as keyof typeof CHAINS];
  if (!chain || !Number.isInteger(workId) || workId < 0 || typeof address !== 'string' || !isAddress(address)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }
  if (typeof timestamp !== 'number' || Date.now() - timestamp > SESSION_MAX_AGE_MS || timestamp > Date.now() + 60_000) {
    return NextResponse.json({ error: 'Session expirée, veuillez signer à nouveau' }, { status: 401 });
  }
  // publicClient.verifyMessage accepte aussi les smart wallets (Coinbase Smart Wallet, Safe…),
  // dont la signature est vérifiée par leur contrat (ERC-1271 / ERC-6492).
  const client = getServerClient(Number(chainId));
  const valid = typeof signature === 'string' && (await client.verifyMessage({
    address: address as `0x${string}`,
    message: buildMediaSessionMessage(address, timestamp),
    signature: signature as `0x${string}`,
  }).catch(() => false));
  if (!valid) return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });

  const jwt = process.env.PINATA_JWT;
  const gateway = process.env.PINATA_GATEWAY || 'coffee-tremendous-crayfish-424.mypinata.cloud';
  if (!jwt) return NextResponse.json({ error: 'Lecture indisponible' }, { status: 500 });

  try {
    const contract = CONTRACT_ADDRESSES[Number(chainId)];
    const [allowed, work] = await Promise.all([
      client.readContract({ address: contract, abi: BeamUpABI, functionName: 'hasAccess', args: [BigInt(workId), address] }),
      client.readContract({ address: contract, abi: BeamUpABI, functionName: 'getWork', args: [BigInt(workId)] }) as Promise<any>,
    ]);
    if (!allowed) return NextResponse.json({ error: "Vous n'avez pas le NFT d'accès à cette œuvre" }, { status: 403 });

    // Jeu premium : achat vérifié ci-dessus ; lien vers le domaine des jeux (isolé de BeamUp).
    if (getFormat(work.category).kind === 'game') return gameLink(work.ipfsCID);

    const cid: string = work.ipfsCID;
    const lookup = await fetch(`https://api.pinata.cloud/v3/files/private?cid=${encodeURIComponent(cid)}&limit=1`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const found = lookup.ok ? (await lookup.json())?.data?.files?.length > 0 : false;

    // Anciennes œuvres premium envoyées avant le stockage privé : lien public.
    if (!found) return NextResponse.json({ url: `${PUBLIC_GATEWAY}${cid}`, private: false });

    const linkRes = await fetch('https://api.pinata.cloud/v3/files/private/download_link', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `https://${gateway}/files/${cid}`, expires: LINK_SECONDS, date: Math.floor(Date.now() / 1000), method: 'GET' }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!linkRes.ok) {
      console.error('Erreur lien Pinata :', linkRes.status, await linkRes.text());
      return NextResponse.json({ error: 'Lecture indisponible' }, { status: 502 });
    }
    const { data: url } = await linkRes.json();
    return NextResponse.json({ url, private: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Erreur accès média :', error);
    return NextResponse.json({ error: 'Œuvre introuvable' }, { status: 404 });
  }
}

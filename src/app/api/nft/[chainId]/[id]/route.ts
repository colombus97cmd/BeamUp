import { NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { getServerClient } from '../../../../../lib/rpc';
import { bsc, polygon, mainnet, arbitrum } from 'viem/chains';
import BeamUpABI from '../../../../../contracts/BeamUpV3.json';
import { CONTRACT_ADDRESSES, getPaymentInfo, getChainName } from '../../../../../config/contracts';
import { getFormat } from '../../../../../config/formats';

// Fiche (métadonnées) des NFT d'accès BeamUpV3, au format lu par OpenSea et les autres marketplaces.
// URI enregistrée dans le contrat : https://beamup.beautifull-earthcorp.tech/api/nft/<chainId>/{id}
// Le standard ERC-1155 remplace {id} par l'identifiant en hexadécimal sur 64 caractères.

const CHAINS = { 56: bsc, 137: polygon, 1: mainnet, 42161: arbitrum } as const;
const SITE = 'https://beamup.beautifull-earthcorp.tech';
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

function parseId(raw: string): bigint | null {
  const clean = raw.replace(/\.json$/i, '');
  if (/^[0-9a-fA-F]{64}$/.test(clean)) return BigInt('0x' + clean);
  if (/^\d{1,12}$/.test(clean)) return BigInt(clean);
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ chainId: string; id: string }> }) {
  const { chainId: rawChain, id: rawId } = await params;
  const chainId = Number(rawChain) as keyof typeof CHAINS;
  const workId = parseId(rawId);
  if (!(chainId in CHAINS) || workId === null) {
    return NextResponse.json({ error: 'NFT introuvable' }, { status: 404 });
  }

  try {
    const client = getServerClient(chainId);
    const work: any = await client.readContract({
      address: CONTRACT_ADDRESSES[chainId],
      abi: BeamUpABI,
      functionName: 'getWork',
      args: [workId],
    });
    if (work.hidden) return NextResponse.json({ error: 'NFT indisponible' }, { status: 404 });

    const format = getFormat(work.category);
    const pay = getPaymentInfo(chainId, work.paymentToken);
    const media = `${IPFS_GATEWAY}${work.ipfsCID}`;
    // Les œuvres premium ne sont pas exposées dans la fiche publique : seule l'icône BeamUp est montrée.
    const isVisual = !work.isPremium && (format.kind === 'image' || format.kind === 'scroll');

    const metadata = {
      name: `${work.title} · Accès BeamUp`,
      description: `NFT d'accès à « ${work.title} » (${format.label}) sur BeamUp. Le détenteur peut lire, écouter ou regarder l'œuvre. Le créateur touche des royalties à chaque revente.`,
      image: isVisual ? media : `${SITE}/icon-512x512.png`,
      ...(isVisual || work.isPremium ? {} : { animation_url: media }),
      external_url: SITE,
      attributes: [
        { trait_type: 'Format', value: format.label },
        { trait_type: 'Réseau', value: getChainName(chainId) },
        { trait_type: 'Créateur', value: work.creator },
        { trait_type: 'Prix', value: `${formatUnits(work.price, pay.decimals)} ${pay.symbol}` },
        { trait_type: 'Édition', value: work.maxSupply > 0n ? `${work.minted} / ${work.maxSupply}` : 'Illimitée' },
      ],
    };

    return NextResponse.json(metadata, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json({ error: 'NFT introuvable' }, { status: 404 });
  }
}

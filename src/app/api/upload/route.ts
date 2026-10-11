import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getServerClient } from '../../../lib/rpc';
import { bsc, polygon, mainnet, arbitrum } from 'viem/chains';
import { buildUploadMessage } from '../../../services/uploadMessage';

// Délivre une clé Pinata temporaire (1 seul upload) à un utilisateur qui a signé
// un message avec son wallet. La clé maîtresse PINATA_JWT reste sur le serveur :
// elle n'est jamais envoyée au navigateur.
//
// Le fichier est ensuite envoyé directement du navigateur vers Pinata avec la clé
// temporaire, ce qui évite la limite de taille des fonctions serverless (vidéos).

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;
const CHAINS = { 56: bsc, 137: polygon, 1: mainnet, 42161: arbitrum } as const;
const MAX_PRIVATE_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 Go

export async function POST(request: Request) {
  try {
    const { address, timestamp, signature, private: isPrivate, chainId } = await request.json();
    const chain = CHAINS[Number(chainId) as keyof typeof CHAINS] || bsc;

    if (typeof address !== 'string' || !isAddress(address)) {
      return NextResponse.json({ error: "Adresse de wallet invalide" }, { status: 400 });
    }
    if (typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > SIGNATURE_MAX_AGE_MS) {
      return NextResponse.json({ error: "Signature expirée, veuillez réessayer" }, { status: 401 });
    }
    if (typeof signature !== 'string' || !signature.startsWith('0x')) {
      return NextResponse.json({ error: "Signature manquante" }, { status: 401 });
    }

    // Accepte aussi les smart wallets (Coinbase Smart Wallet, Safe…) via ERC-1271 / ERC-6492.
    const valid = await getServerClient(chain.id).verifyMessage({
      address: address as `0x${string}`,
      message: buildUploadMessage(address, timestamp),
      signature: signature as `0x${string}`,
    });
    if (!valid) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    const adminJwt = process.env.PINATA_JWT;
    if (!adminJwt) {
      console.error("PINATA_JWT n'est pas configurée côté serveur");
      return NextResponse.json({ error: "Upload indisponible" }, { status: 500 });
    }

    // Œuvre premium : URL d'envoi signée vers le réseau IPFS privé de Pinata (valable 10 min).
    // Le fichier n'est ensuite lisible que via un lien temporaire délivré par /api/media.
    if (isPrivate === true) {
      const signRes = await fetch("https://uploads.pinata.cloud/v3/files/sign", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminJwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: Math.floor(Date.now() / 1000), expires: 600, network: 'private', max_file_size: MAX_PRIVATE_FILE_SIZE }),
      });
      if (!signRes.ok) {
        console.error("Erreur Pinata sign:", signRes.status, await signRes.text());
        return NextResponse.json({ error: "Impossible de préparer l'upload privé" }, { status: 502 });
      }
      const { data: uploadUrl } = await signRes.json();
      return NextResponse.json({ uploadUrl });
    }

    const response = await fetch("https://api.pinata.cloud/users/generateApiKey", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyName: `beamup-upload-${address.toLowerCase()}-${timestamp}`,
        maxUses: 1,
        permissions: { endpoints: { pinning: { pinFileToIPFS: true } } },
      }),
    });

    if (!response.ok) {
      console.error("Erreur Pinata generateApiKey:", response.status, await response.text());
      return NextResponse.json({ error: "Impossible de préparer l'upload" }, { status: 502 });
    }

    const { JWT } = await response.json();
    return NextResponse.json({ jwt: JWT });

  } catch (error) {
    console.error("Erreur serveur upload:", error);
    return NextResponse.json({ error: "Échec de la préparation de l'upload" }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { isAddress, verifyMessage } from 'viem';
import { clientIp } from '../../../../lib/security';
import { hasPurchased } from '../../../../lib/games';
import { redis, rateLimited, hasRedis } from '../../../../lib/redis';
import { privateLink } from '../../../../lib/games/pinata';
import { issueLicence, licenceMessage, licencePublicKey, LICENCE_DAYS, WINDOWS_KEY } from '../../../../lib/licence';

// Version Windows de Chains & Crowns, réservée aux acheteurs (achat vérifié sur la blockchain, wallet prouvé par signature).
//  GET                                   → { available, version, size, publicKey } (public) ;
//  POST { action: 'licence', address, issuedAt, signature } → licence signée (45 jours) pour l'application ;
//  POST { action: 'download', ... }      → lien de téléchargement temporaire de l'installateur (fichier privé chez Pinata).

export async function GET() {
  const [raw] = hasRedis() ? await redis([['GET', WINDOWS_KEY]]) : [null];
  const info = raw ? JSON.parse(raw) : null;
  return NextResponse.json({ available: Boolean(info), version: info?.version || null, size: info?.size || null, updatedAt: info?.at || null, publicKey: licencePublicKey() });
}

export async function POST(req: Request) {
  if (!hasRedis()) return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });
  if (await rateLimited(`licence:${clientIp(req)}`, 10)) return NextResponse.json({ error: 'Trop de tentatives, réessayez dans une minute.' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const address = String(body?.address || '').toLowerCase();
  const issuedAt = Number(body?.issuedAt);
  if (!isAddress(address) || !Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 10 * 60_000) {
    return NextResponse.json({ error: 'Signature expirée ou wallet invalide, réessayez.' }, { status: 401 });
  }
  const valid = await verifyMessage({ address: address as `0x${string}`, message: licenceMessage(address, issuedAt), signature: String(body?.signature || '') as `0x${string}` }).catch(() => false);
  if (!valid) return NextResponse.json({ error: 'Signature du wallet invalide.' }, { status: 401 });
  if (!(await hasPurchased(address))) {
    return NextResponse.json({ error: 'Ce wallet n’a pas acheté l’édition complète de Chains & Crowns. Connectez le wallet utilisé pour l’achat.' }, { status: 403 });
  }

  if (body?.action === 'licence') {
    return NextResponse.json({ licence: issueLicence(address), days: LICENCE_DAYS });
  }
  if (body?.action === 'download') {
    const [raw] = await redis([['GET', WINDOWS_KEY]]);
    if (!raw) return NextResponse.json({ error: 'La version Windows n’est pas encore disponible.' }, { status: 404 });
    const info = JSON.parse(raw);
    return NextResponse.json({ url: await privateLink(info.cid, 3600), version: info.version, fileName: info.fileName });
  }
  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

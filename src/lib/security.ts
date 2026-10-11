import { timingSafeEqual } from 'crypto';
import { verifyMessage } from 'viem';
import { walletMessage } from './walletMessage';
import { sessionAddress } from './adminAuth';

// Protection des routes appelées par Vercel Cron (Authorization: Bearer CRON_SECRET)
// et des actions d'administration : session d'un signataire du Safe (page /pilotage),
// ou en-tête x-admin-secret = ADMIN_SECRET pour les scripts.

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function isCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && same(req.headers.get('authorization') || '', `Bearer ${secret}`);
}

/** Identité de l'administrateur : adresse du signataire du Safe, « script » (secret), ou null. */
export function adminIdentity(req: Request): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (secret && same(req.headers.get('x-admin-secret') || '', secret)) return 'script';
  return sessionAddress(req);
}

export const isAdmin = (req: Request) => adminIdentity(req) !== null;

export const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'inconnu';

export { walletMessage };

export async function verifyWallet(address: string, issuedAt: number, signature: string): Promise<boolean> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address) || !/^0x[0-9a-fA-F]+$/.test(signature)) return false;
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 10 * 60_000) return false;
  try {
    return await verifyMessage({ address: address as `0x${string}`, message: walletMessage(address, issuedAt), signature: signature as `0x${string}` });
  } catch {
    return false;
  }
}

import { createHmac, timingSafeEqual } from 'crypto';
import { parseAbi } from 'viem';
import { SAFE_ADDRESS, SUPPORTED_CHAIN_IDS, DEFAULT_CHAIN } from '../config/contracts';
import { getServerClient } from './rpc';
import { adminMessage } from './adminMessage';

// Accès à la page de pilotage : réservé aux signataires du Safe propriétaire de BeamUp.
// 1. Le signataire signe un message avec son wallet (aucune transaction).
// 2. Le serveur vérifie la signature (wallets classiques et wallets-contrats) et que l'adresse figure dans getOwners() du Safe.
// 3. Il pose un cookie de session signé (HMAC, ADMIN_SESSION_SECRET), valable 8 heures.
// Un signataire retiré du Safe perd l'accès au plus tard à l'expiration de sa session.

const SAFE_ABI = parseAbi(['function getOwners() view returns (address[])']);
export const SESSION_COOKIE = 'beam_admin';
const SESSION_HOURS = 8;

export { adminMessage };

/** Signataires du Safe, réunis sur tous les réseaux où il est déployé. */
export async function safeOwners(): Promise<string[]> {
  const chains = [DEFAULT_CHAIN, ...SUPPORTED_CHAIN_IDS.filter((c) => c !== DEFAULT_CHAIN)];
  const results = await Promise.allSettled(chains.map((c) =>
    getServerClient(c).readContract({ address: SAFE_ADDRESS as `0x${string}`, abi: SAFE_ABI, functionName: 'getOwners' })));
  const owners = new Set<string>();
  for (const r of results) if (r.status === 'fulfilled') r.value.forEach((a) => owners.add(a.toLowerCase()));
  return [...owners];
}

const secret = () => {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('ADMIN_SESSION_SECRET manquant (32 caractères minimum)');
  return s;
};
const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('hex');

/** Vérifie la signature et l'appartenance au Safe. Renvoie le jeton de session, ou null. */
export async function openSession(address: string, issuedAt: number, signature: string): Promise<string | null> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address) || !Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 10 * 60_000) return null;
  const addr = address.toLowerCase();
  let valid = false;
  try {
    // verifyMessage du client public accepte aussi les wallets-contrats (ERC-1271), dont les Safe.
    valid = await getServerClient(DEFAULT_CHAIN).verifyMessage({ address: addr as `0x${string}`, message: adminMessage(addr, issuedAt), signature: signature as `0x${string}` });
  } catch { valid = false; }
  if (!valid) return null;
  if (!(await safeOwners()).includes(addr)) return null;
  const payload = `${addr}.${Date.now() + SESSION_HOURS * 3600_000}`;
  return `${payload}.${sign(payload)}`;
}

/** Adresse du signataire connecté, ou null. */
export function sessionAddress(req: Request): string | null {
  const cookie = (req.headers.get('cookie') || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;
  const [addr, exp, mac] = decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1)).split('.');
  if (!addr || !exp || !mac || Number(exp) < Date.now()) return null;
  try {
    const expected = Buffer.from(sign(`${addr}.${exp}`));
    const given = Buffer.from(mac);
    return expected.length === given.length && timingSafeEqual(expected, given) ? addr : null;
  } catch {
    return null;
  }
}

export const sessionCookie = (token: string) =>
  `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
export const clearedCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

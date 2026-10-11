import BeamUpABI from '../contracts/BeamUpV3.json';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { getServerClient } from './rpc';
import { redis, hashToObject } from './redis';

// Décisions de modération. Les commentaires sont sur la blockchain et ne s'effacent pas :
// on enregistre seulement les commentaires masqués à l'affichage, avec la raison, et un journal des décisions.

export const hiddenKey = (chainId: number, workId: number) => `beam:v1:mod:hidden:${chainId}:${workId}`;
export const cursorKey = (chainId: number, workId: number) => `beam:v1:mod:cursor:${chainId}:${workId}`;
export const LOG_KEY = 'beam:v1:mod:log';
const LOG_SIZE = 1000;

/** revealable : le texte original peut être consulté au survol (faux pour un contenu illégal, que la loi impose de rendre inaccessible). */
export interface Hidden { reason: string; by: 'agent' | 'admin' | 'signalement'; at: string; revealable?: boolean }

export async function hiddenComments(chainId: number, workId: number): Promise<Record<string, Hidden>> {
  const [flat] = await redis([['HGETALL', hiddenKey(chainId, workId)]]);
  const raw = hashToObject(flat);
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, JSON.parse(v) as Hidden]));
}

export async function logDecision(entry: Record<string, unknown>) {
  await redis([['LPUSH', LOG_KEY, JSON.stringify({ ...entry, at: new Date().toISOString() })], ['LTRIM', LOG_KEY, 0, LOG_SIZE - 1]]);
}

export async function hide(chainId: number, workId: number, index: number, h: Omit<Hidden, 'at'>) {
  await redis([['HSET', hiddenKey(chainId, workId), String(index), JSON.stringify({ ...h, at: new Date().toISOString() })]]);
}

export async function unhide(chainId: number, workId: number, index: number) {
  await redis([['HDEL', hiddenKey(chainId, workId), String(index)]]);
}

const contract = (chainId: number) => ({ address: CONTRACT_ADDRESSES[chainId], abi: BeamUpABI as any });

export async function worksCount(chainId: number): Promise<number> {
  return Number(await getServerClient(chainId).readContract({ ...contract(chainId), functionName: 'worksCount' }));
}

export async function commentsCount(chainId: number, workId: number): Promise<number> {
  return Number(await getServerClient(chainId).readContract({ ...contract(chainId), functionName: 'commentsCount', args: [BigInt(workId)] }));
}

/** Lit des commentaires sur la blockchain (source de vérité : on ne fait jamais confiance au texte envoyé par le navigateur). */
export async function readComments(chainId: number, workId: number, offset: number, limit: number): Promise<{ author: string; text: string }[]> {
  const page = (await getServerClient(chainId).readContract({
    ...contract(chainId), functionName: 'getWorkComments', args: [BigInt(workId), BigInt(offset), BigInt(limit)],
  })) as any[];
  return page.map((c) => ({ author: String(c.author ?? c[0]), text: String(c.text ?? c[1]) }));
}

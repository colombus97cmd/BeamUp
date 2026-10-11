import BeamUpABI from '../contracts/BeamUpV3.json';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { getServerClient } from './rpc';

// Produits payants des jeux, publiés comme œuvres premium BeamUp (achat = NFT d'accès ERC-1155).
// GAME_PRODUCTS = liste « réseau:œuvre:type », ex. « 56:42:jeu,56:43:pass-saison-1 ».
// Le pass saison fait office d'abonnement : une nouvelle œuvre premium par saison.

export interface GameProduct { chainId: number; workId: number; kind: string }

export function gameProducts(): GameProduct[] {
  return (process.env.GAME_PRODUCTS || '')
    .split(',')
    .map((s) => s.trim().split(':'))
    .filter((p) => p.length >= 2 && Number(p[0]) in CONTRACT_ADDRESSES && Number.isInteger(Number(p[1])))
    .map(([c, w, k]) => ({ chainId: Number(c), workId: Number(w), kind: k || 'jeu' }));
}

const read = (p: GameProduct, functionName: string, args: unknown[]) =>
  getServerClient(p.chainId).readContract({ address: CONTRACT_ADDRESSES[p.chainId], abi: BeamUpABI as any, functionName, args }) as Promise<any>;

/** Nombre de ventes par produit (champ `minted` de l'œuvre). */
export async function salesByProduct(): Promise<(GameProduct & { sales: number })[]> {
  return Promise.all(gameProducts().map(async (p) => {
    try {
      const w = await read(p, 'getWork', [BigInt(p.workId)]);
      return { ...p, sales: Number(w.minted ?? w[11] ?? 0) };
    } catch {
      return { ...p, sales: 0 };
    }
  }));
}

/** Vrai si le wallet a acheté au moins un produit (jeu ou pass). Le créateur de l'œuvre compte aussi. */
export async function hasPurchased(address: string): Promise<boolean> {
  for (const p of gameProducts()) {
    try {
      if (await read(p, 'hasAccess', [BigInt(p.workId), address])) return true;
    } catch { /* réseau indisponible : produit suivant */ }
  }
  return false;
}

'use client';
import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import BeamUpABI from '../contracts/BeamUpV3.json';
import { CONTRACT_ADDRESSES, SUPPORTED_CHAIN_IDS, getPaymentInfo, getChainName, EUR_TOKENS, USD_TOKENS } from '../config/contracts';
import { getFormat } from '../config/formats';
import { preferredCurrency } from '../lib/region';
import type { WorkView } from './useWorks';

const PAGE_SIZE = 100;
const ZERO = '0x0000000000000000000000000000000000000000';

// Identifiant unique d'une œuvre tous réseaux confondus. BNB Chain garde l'identifiant du contrat
// (rang 0), ce qui conserve les bibliothèques et les vues déjà enregistrées.
const CHAIN_ORDER = [56, 137, 1, 42161];
const OFFSET = 10_000_000;
export const toUid = (chainId: number, workId: number) => CHAIN_ORDER.indexOf(chainId) * OFFSET + workId;

/**
 * Un même jeu peut être publié en plusieurs éditions (même fichier, prix en euros sur un réseau, en dollars sur un autre).
 * Le fil n'en garde qu'une : celle que le visiteur possède ou a créée, sinon celle de sa monnaie (voir lib/region.ts).
 */
function pickGameEditions(works: MultiChainWork[], user?: string): MultiChainWork[] {
  const currency = preferredCurrency();
  const me = user?.toLowerCase();
  const editionCurrency = (w: MultiChainWork) => {
    const token = String(w.paymentToken || '').toLowerCase();
    if (EUR_TOKENS[w.chainId]?.address.toLowerCase() === token) return 'eur';
    if (USD_TOKENS[w.chainId]?.address.toLowerCase() === token) return 'usd';
    return 'autre';
  };
  const score = (w: MultiChainWork) => (w.hasPaid || w.creator?.toLowerCase() === me ? 4 : 0) + (editionCurrency(w) === currency ? 2 : 0) + (w.soldOut ? 0 : 1);
  const best = new Map<string, MultiChainWork>();
  for (const w of works) {
    if (getFormat(w.category).kind !== 'game') continue;
    const current = best.get(w.ipfsCID);
    if (!current || score(w) > score(current)) best.set(w.ipfsCID, w);
  }
  return works.filter((w) => getFormat(w.category).kind !== 'game' || best.get(w.ipfsCID) === w);
}

export interface MultiChainWork extends WorkView {
  /** Identifiant unique (clé d'affichage, bibliothèque, vues). */
  id: number;
  /** Identifiant de l'œuvre dans le contrat de son réseau. */
  workId: number;
  chainId: number;
  chainName: string;
}

const abi = BeamUpABI as any;

/** Lit les œuvres des 4 réseaux et les réunit dans un seul fil, les plus récentes d'abord. */
export function useAllWorks(user?: string) {
  const chains = SUPPORTED_CHAIN_IDS;

  const { data: counts, refetch: refetchCounts, isLoading: countsLoading } = useReadContracts({
    contracts: chains.map((chainId) => ({ chainId, address: CONTRACT_ADDRESSES[chainId], abi, functionName: 'worksCount' })),
  });

  const totals = chains.map((_, i) => (counts?.[i]?.status === 'success' ? Number(counts[i].result as bigint) : 0));

  const pageCalls = chains.flatMap((chainId, i) =>
    Array.from({ length: Math.ceil(totals[i] / PAGE_SIZE) }, (_, p) => ({
      chainId,
      address: CONTRACT_ADDRESSES[chainId],
      abi,
      functionName: 'getWorksPage',
      args: [BigInt(p * PAGE_SIZE), BigInt(PAGE_SIZE)],
    }))
  );
  const { data: pages, refetch: refetchPages, isLoading: pagesLoading } = useReadContracts({
    contracts: pageCalls,
    query: { enabled: pageCalls.length > 0 },
  });

  const premiumCalls = chains
    .map((chainId, i) => ({ chainId, total: totals[i] }))
    .filter((c) => c.total > 0)
    .map(({ chainId, total }) => ({
      chainId,
      address: CONTRACT_ADDRESSES[chainId],
      abi,
      functionName: 'getPremiumBatch',
      args: [Array.from({ length: total }, (_, k) => BigInt(k)), (user || ZERO) as `0x${string}`],
    }));
  const { data: premium, refetch: refetchPremium } = useReadContracts({
    contracts: premiumCalls,
    query: { enabled: premiumCalls.length > 0 },
  });

  const works: MultiChainWork[] = useMemo(() => {
    const out: MultiChainWork[] = [];
    let pageIdx = 0;
    chains.forEach((chainId, ci) => {
      const nPages = Math.ceil(totals[ci] / PAGE_SIZE);
      const flat = (pages || []).slice(pageIdx, pageIdx + nPages).flatMap((r: any) => (r?.status === 'success' ? (r.result as any[]) : []));
      pageIdx += nPages;
      const pIdx = premiumCalls.findIndex((c) => c.chainId === chainId);
      const paid = (premium?.[pIdx]?.result as any)?.[2] as boolean[] | undefined;
      flat.forEach((w: any, workId: number) => {
        if (w.hidden) return;
        const pay = getPaymentInfo(chainId, w.paymentToken);
        out.push({
          ...w,
          id: toUid(chainId, workId),
          workId,
          chainId,
          chainName: getChainName(chainId),
          hasPaid: paid?.[workId] ?? false,
          priceLabel: `${formatUnits(w.price, pay.decimals)} ${pay.symbol}`,
          soldOut: w.maxSupply > 0n && w.minted >= w.maxSupply,
        });
      });
    });
    return pickGameEditions(out, user).sort((a, b) => Number(b.timestamp - a.timestamp));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, premium, totals.join(',')]);

  const refetch = () => {
    refetchCounts();
    refetchPages();
    refetchPremium();
  };

  return { works, isLoading: countsLoading || (pageCalls.length > 0 && pagesLoading), refetch };
}

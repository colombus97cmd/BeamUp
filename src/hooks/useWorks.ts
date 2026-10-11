'use client';
import { useMemo } from 'react';
import { useReadContract, useReadContracts, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import BeamUpABI from '../contracts/BeamUpV3.json';
import { getContractAddress, getPaymentInfo, NATIVE_TOKEN } from '../config/contracts';

const PAGE_SIZE = 100;
const ZERO = '0x0000000000000000000000000000000000000000';

export interface WorkView {
  id: number;
  creator: `0x${string}`;
  ipfsCID: string;
  title: string;
  category: string;
  totalTips: bigint;
  timestamp: bigint;
  likesCount: bigint;
  isPremium: boolean;
  price: bigint;
  paymentToken: `0x${string}`;
  maxSupply: bigint;
  minted: bigint;
  metadataURI: string;
  hidden: boolean;
  hasPaid: boolean;
  priceLabel: string;
  soldOut: boolean;
}

/**
 * Lit toutes les œuvres du contrat V3 par pages de 100 (le contrat refuse les lectures illimitées),
 * puis l'état d'accès premium de l'utilisateur. Les œuvres masquées sont exclues.
 */
export function useWorks(user?: string) {
  const chainId = useChainId();
  const address = getContractAddress(chainId);

  const { data: count, refetch: refetchCount } = useReadContract({ address, abi: BeamUpABI, functionName: 'worksCount' });
  const total = Number((count as bigint | undefined) ?? 0n);
  const pages = Math.ceil(total / PAGE_SIZE);

  const { data: pageData, isLoading, refetch: refetchPages } = useReadContracts({
    contracts: Array.from({ length: pages }, (_, p) => ({
      address,
      abi: BeamUpABI as any,
      functionName: 'getWorksPage',
      args: [BigInt(p * PAGE_SIZE), BigInt(PAGE_SIZE)],
    })),
    query: { enabled: pages > 0 },
  });

  const ids = useMemo(() => Array.from({ length: total }, (_, i) => BigInt(i)), [total]);
  const { data: premium, refetch: refetchPremium } = useReadContract({
    address,
    abi: BeamUpABI,
    functionName: 'getPremiumBatch',
    args: [ids, (user || ZERO) as `0x${string}`],
    query: { enabled: total > 0 },
  });

  const works: WorkView[] = useMemo(() => {
    const flat = (pageData || []).flatMap((r) => (r.status === 'success' ? (r.result as any[]) : []));
    const paid = (premium as any)?.[2] as boolean[] | undefined;
    return flat
      .map((w: any, i: number) => {
        const pay = getPaymentInfo(chainId, w.paymentToken);
        const soldOut = w.maxSupply > 0n && w.minted >= w.maxSupply;
        return {
          ...w,
          id: i,
          hasPaid: paid?.[i] ?? false,
          priceLabel: `${formatUnits(w.price, pay.decimals)} ${pay.symbol}`,
          soldOut,
        } as WorkView;
      })
      .filter((w) => !w.hidden);
  }, [pageData, premium, chainId]);

  const refetch = () => {
    refetchCount();
    refetchPages();
    refetchPremium();
  };

  return { works, total, isLoading: isLoading && pages > 0, refetch, contractAddress: address, chainId, NATIVE_TOKEN };
}

import { createPublicClient, fallback, http, type Chain } from 'viem';
import { bsc, polygon, mainnet, arbitrum } from 'viem/chains';

// RPC fiables par réseau, avec délai maximal et repli automatique.
// (Le RPC par défaut de viem pour BNB Chain, thirdweb, ne répond pas depuis les serveurs Vercel.)
export const RPC_URLS: Record<number, string[]> = {
  56: ['https://bsc-dataseed.binance.org/', 'https://bsc-rpc.publicnode.com', 'https://bsc-dataseed1.defibit.io/'],
  137: ['https://polygon-bor-rpc.publicnode.com', 'https://polygon.drpc.org'],
  1: ['https://ethereum-rpc.publicnode.com', 'https://eth.merkle.io'],
  42161: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum-one-rpc.publicnode.com'],
};

export const SERVER_CHAINS: Record<number, Chain> = { 56: bsc, 137: polygon, 1: mainnet, 42161: arbitrum };

export const rpcTransport = (chainId: number) =>
  fallback((RPC_URLS[chainId] || RPC_URLS[56]).map((url) => http(url, { timeout: 8_000, retryCount: 1 })));

export const getServerClient = (chainId: number) =>
  createPublicClient({ chain: SERVER_CHAINS[chainId] || bsc, transport: rpcTransport(chainId) });

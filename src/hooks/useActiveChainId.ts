'use client';
import { useAccount } from 'wagmi';
import { DEFAULT_CHAIN, isSupportedChain } from '../config/contracts';

/**
 * Réseau à utiliser pour lire / écrire : celui du wallet connecté s'il est pris en charge,
 * sinon BNB Chain. (useChainId de wagmi renvoie Ethereum pour un visiteur non connecté.)
 */
export function useActiveChainId(): number {
  const { chainId, isConnected } = useAccount();
  return isConnected && chainId && isSupportedChain(chainId) ? chainId : DEFAULT_CHAIN;
}

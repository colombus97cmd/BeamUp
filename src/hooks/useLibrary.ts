'use client';
import { useCallback, useEffect, useState } from 'react';

// Œuvres ajoutées à « Ma bibliothèque », par réseau et par wallet.
// Stockées dans le navigateur ; les achats (NFT d'accès) y figurent automatiquement.
const key = (chainId: number, address?: string) => `beam_library_${chainId}_${(address || 'invite').toLowerCase()}`;

export function useLibrary(chainId: number, address?: string) {
  const [saved, setSaved] = useState<number[]>([]);

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(key(chainId, address)) || '[]'));
    } catch {
      setSaved([]);
    }
  }, [chainId, address]);

  const toggle = useCallback(
    (id: number) => {
      setSaved((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        try {
          localStorage.setItem(key(chainId, address), JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [chainId, address]
  );

  const isSaved = useCallback((id: number) => saved.includes(id), [saved]);

  return { saved, toggle, isSaved };
}

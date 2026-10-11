// Adresses des contrats BeamUpV3 (proxy UUPS, propriétaire = Safe 0x5DBE…6a1e), déployés le 11/10/2026.
// N'ajouter un réseau ici qu'après avoir vérifié qu'un contrat existe à l'adresse (eth_getCode != "0x").
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  56: '0x715ED1F24a0D00F641E614CA2106aA8CC4266De5',    // BNB Chain
  137: '0x70f3590079016C9D65dB477d7689BE3Af68717D3',   // Polygon
  1: '0xf24d571f96BFAEDEf0aC19d940a348B789dcB308',     // Ethereum
  42161: '0x7eF9447247477A6A09D41f5eba92849A39641ca7', // Arbitrum One
};

// Anciens contrats BeamUpV2 (non upgradables), conservés pour l'historique.
export const LEGACY_V2_ADDRESSES: Record<number, `0x${string}`> = {
  56: '0x92c1D8eCE7962634cF337d763994Af1490605dA4',
  137: '0x6a2BC463fd7e1b6E6769023F8CD41835e347C317',
  1: '0x358feFc4B23b139Fa6A7bb6C9Fc559547768B698',
  42161: '0x6a2BC463fd7e1b6E6769023F8CD41835e347C317',
};

export const SAFE_ADDRESS = '0x5DBE809214C6a9eec3CD9b25277dd3b1F37B6a1e';

export const DEFAULT_CHAIN = 56;

export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';

export const SUPPORTED_CHAIN_IDS = Object.keys(CONTRACT_ADDRESSES).map(Number);

export const isSupportedChain = (chainId: number) => chainId in CONTRACT_ADDRESSES;

export const getContractAddress = (chainId: number) =>
  CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[DEFAULT_CHAIN];

const CHAINS: Record<number, { name: string; symbol: string; explorer: string; safePrefix: string }> = {
  56: { name: 'BNB Chain', symbol: 'BNB', explorer: 'https://bscscan.com', safePrefix: 'bnb' },
  137: { name: 'Polygon', symbol: 'POL', explorer: 'https://polygonscan.com', safePrefix: 'matic' },
  1: { name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io', safePrefix: 'eth' },
  42161: { name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io', safePrefix: 'arb1' },
};

const chainInfo = (chainId: number) => CHAINS[chainId] || CHAINS[DEFAULT_CHAIN];

export const getCurrencySymbol = (chainId: number) => chainInfo(chainId).symbol;

export const getChainName = (chainId: number) => chainInfo(chainId).name;

export const getExplorer = (chainId: number) => chainInfo(chainId).explorer;

export const getSafeUrl = (chainId: number) => `https://app.safe.global/home?safe=${chainInfo(chainId).safePrefix}:${SAFE_ADDRESS}`;

// Jeton bitcoin accepté par réseau (autorisé dans le contrat à l'initialisation).
export interface PaymentToken {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}

export const BTC_TOKENS: Record<number, PaymentToken> = {
  56: { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', decimals: 18 },
  137: { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', symbol: 'WBTC', decimals: 8 },
  1: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8 },
  42161: { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC', decimals: 8 },
};

/** Symbole et décimales d'un moyen de paiement (monnaie native ou jeton bitcoin). */
export const getPaymentInfo = (chainId: number, token?: string): { symbol: string; decimals: number; isNative: boolean } => {
  if (!token || token.toLowerCase() === NATIVE_TOKEN) return { symbol: getCurrencySymbol(chainId), decimals: 18, isNative: true };
  const btc = BTC_TOKENS[chainId];
  if (btc && btc.address.toLowerCase() === token.toLowerCase()) return { symbol: btc.symbol, decimals: btc.decimals, isNative: false };
  return { symbol: 'jeton', decimals: 18, isNative: false };
};

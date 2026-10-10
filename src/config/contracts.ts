// Adresses des contrats BeamUpV2 réellement déployés.
// N'ajouter un réseau ici qu'après avoir vérifié qu'un contrat existe à l'adresse (eth_getCode != "0x").
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  56: '0x92c1D8eCE7962634cF337d763994Af1490605dA4',  // BSC Mainnet
  137: '0x6a2BC463fd7e1b6E6769023F8CD41835e347C317', // Polygon Mainnet
  1: '0x358feFc4B23b139Fa6A7bb6C9Fc559547768B698',   // Ethereum Mainnet
  42161: '0x6a2BC463fd7e1b6E6769023F8CD41835e347C317', // Arbitrum One
};

export const DEFAULT_CHAIN = 56;

export const SUPPORTED_CHAIN_IDS = Object.keys(CONTRACT_ADDRESSES).map(Number);

export const isSupportedChain = (chainId: number) => chainId in CONTRACT_ADDRESSES;

export const getContractAddress = (chainId: number) =>
  CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[DEFAULT_CHAIN];

const CHAINS: Record<number, { name: string; symbol: string; explorer: string }> = {
  56: { name: 'BNB Chain', symbol: 'BNB', explorer: 'https://bscscan.com' },
  137: { name: 'Polygon', symbol: 'POL', explorer: 'https://polygonscan.com' },
  1: { name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io' },
  42161: { name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io' },
};

export const getCurrencySymbol = (chainId: number) => (CHAINS[chainId] || CHAINS[DEFAULT_CHAIN]).symbol;

export const getChainName = (chainId: number) => (CHAINS[chainId] || CHAINS[DEFAULT_CHAIN]).name;

export const getExplorer = (chainId: number) => (CHAINS[chainId] || CHAINS[DEFAULT_CHAIN]).explorer;

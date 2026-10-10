// Adresses des contrats BeamUpV2 réellement déployés.
// N'ajouter un réseau ici qu'après avoir vérifié qu'un contrat existe à l'adresse (eth_getCode != "0x").
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  56: '0x92c1D8eCE7962634cF337d763994Af1490605dA4',  // BSC Mainnet
  137: '0x6a2BC463fd7e1b6E6769023F8CD41835e347C317', // Polygon Mainnet
};

export const DEFAULT_CHAIN = 56;

export const SUPPORTED_CHAIN_IDS = Object.keys(CONTRACT_ADDRESSES).map(Number);

export const isSupportedChain = (chainId: number) => chainId in CONTRACT_ADDRESSES;

export const getContractAddress = (chainId: number) =>
  CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[DEFAULT_CHAIN];

export const getCurrencySymbol = (chainId: number) => (chainId === 137 ? 'POL' : 'BNB');

export const getChainName = (chainId: number) => (chainId === 137 ? 'Polygon' : 'BNB Chain');

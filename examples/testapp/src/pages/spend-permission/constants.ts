import { arbitrum, avalanche, base, bsc, mainnet, optimism, polygon } from 'viem/chains';

// Local storage key for spender account
export const SPENDER_ACCOUNT_STORAGE_KEY = 'coinbase-wallet-sdk.spend-permission.spender-pk';

// EIP-7702 delegation designation prefix
export const EIP7702_DELEGATION_PREFIX = '0xef0100';

// SpendPermissionManager address
export const SPEND_PERMISSION_MANAGER_ADDRESS = '0xf85210B21cC50302F477BA56686d2019dC9b67Ad';

// Default token addresses (native token represented as special address)
export const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// ABI for checking if an address is an owner
export const IS_OWNER_ADDRESS_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'isOwnerAddress',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ABI for getting owner count and owners
export const OWNER_ABI = [
  {
    inputs: [],
    name: 'ownerCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'index', type: 'uint256' }],
    name: 'ownerAtIndex',
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Supported networks for switching
export const NETWORKS = [
  {
    name: 'Ethereum',
    chain: mainnet,
    chainId: 1,
    color: 'gray',
    nativeToken: 'ETH',
    explorer: 'https://etherscan.io',
  },
  {
    name: 'Base',
    chain: base,
    chainId: 8453,
    color: 'blue',
    nativeToken: 'ETH',
    explorer: 'https://basescan.org',
  },
  {
    name: 'Arbitrum',
    chain: arbitrum,
    chainId: 42161,
    color: 'cyan',
    nativeToken: 'ETH',
    explorer: 'https://arbiscan.io',
  },
  {
    name: 'Optimism',
    chain: optimism,
    chainId: 10,
    color: 'red',
    nativeToken: 'ETH',
    explorer: 'https://optimistic.etherscan.io',
  },
  {
    name: 'Polygon',
    chain: polygon,
    chainId: 137,
    color: 'purple',
    nativeToken: 'POL',
    explorer: 'https://polygonscan.com',
  },
  {
    name: 'BNB',
    chain: bsc,
    chainId: 56,
    color: 'yellow',
    nativeToken: 'BNB',
    explorer: 'https://bscscan.com',
  },
  {
    name: 'Avalanche',
    chain: avalanche,
    chainId: 43114,
    color: 'orange',
    nativeToken: 'AVAX',
    explorer: 'https://snowtrace.io',
  },
] as const;

export type Network = (typeof NETWORKS)[number];

// CoinGecko IDs for native tokens
export const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  POL: 'matic-network',
  BNB: 'binancecoin',
  AVAX: 'avalanche-2',
};

// Helper to get native token symbol for a chain
export const getNativeTokenSymbol = (chainId: number | null | undefined): string => {
  if (!chainId) return 'ETH';
  const network = NETWORKS.find((n) => n.chainId === chainId);
  return network?.nativeToken || 'ETH';
};

// Helper to get network by chainId
export const getNetworkByChainId = (chainId: number): Network | undefined => {
  return NETWORKS.find((n) => n.chainId === chainId);
};

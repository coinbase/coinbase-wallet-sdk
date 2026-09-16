/**
 * Token configuration for supported payment tokens
 */
export const TOKENS = {
  USDC: {
    decimals: 6,
    addresses: {
      base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
  },
} as const;

/**
 * Chain IDs for supported networks
 */
export const CHAIN_IDS = {
  base: 8453,
  baseSepolia: 84532,
} as const;

/**
 * Default bundler endpoints for payment status checks
 */
export const DEFAULT_BUNDLER_URLS = {
  base: 'https://chain-proxy.wallet.coinbase.com?targetName=base',
  baseSepolia: 'https://chain-proxy.wallet.coinbase.com?targetName=base-sepolia',
} as const;

/** Default request headers for payment status checks */
export const DEFAULT_BUNDLER_HEADERS = {
  'x-tpp-client-project-name': 'base-pay-sdk',
  'x-tpp-client-feature-name': 'payment-status',
} as const;

/**
 * ERC20 transfer function ABI
 */
export const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'Transfer',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

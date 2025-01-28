import { Chain } from 'viem';
import { baseSepolia, optimismSepolia, sepolia } from 'viem/chains';

/**
 * TODO[jake]: ensure all supported chains are added here
 */

// Currently only testnets are supported
export const SUPPORTED_CHAIN_MAP = {
  [baseSepolia.id]: baseSepolia,
  [sepolia.id]: sepolia,
  [optimismSepolia.id]: optimismSepolia,
} as Record<number, Chain>;

import { http, PublicClient, createPublicClient } from 'viem';
import * as chains from 'viem/chains';

/**
 * Converts a chainId to a viem PublicClient.
 *
 * This helper is for the node environment or server side rendering. It imports all the chains from viem,
 * which can be bloated for frontend applications.
 *
 * @param chainId - The chain ID to get a public client for
 * @returns PublicClient instance or undefined if chain is not supported
 */
export function getPublicClientFromChainId(chainId: number): PublicClient | undefined {
  const viemChain = Object.values(chains).find((chain) => chain.id === chainId);
  if (!viemChain) {
    return undefined;
  }

  return createPublicClient({
    chain: viemChain,
    transport: http(),
  }) as PublicClient;
}

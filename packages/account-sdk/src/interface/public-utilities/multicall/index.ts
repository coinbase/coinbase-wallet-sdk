import type { PublicClient } from 'viem';
import { multicall as viemMulticall } from 'viem/actions';
import type { ContractCall, MulticallFailure, MulticallResult, MulticallSuccess } from './types.js';

/**
 * Executes multiple contract read calls in a single RPC request using multicall3.
 *
 * This utility batches multiple contract read operations into a single network request,
 * significantly improving performance and reducing RPC costs when fetching data from
 * multiple contracts or making multiple calls to the same contract.
 *
 * @example
 * ```typescript
 * import { multicall } from '@coinbase/wallet-sdk';
 * import { createPublicClient, http } from 'viem';
 * import { base } from 'viem/chains';
 *
 * const client = createPublicClient({
 *   chain: base,
 *   transport: http(),
 * });
 *
 * const results = await multicall(client, {
 *   contracts: [
 *     {
 *       address: '0x...',
 *       abi: myAbi,
 *       functionName: 'balanceOf',
 *       args: ['0x...'],
 *     },
 *     {
 *       address: '0x...',
 *       abi: myAbi,
 *       functionName: 'totalSupply',
 *     },
 *   ],
 * });
 *
 * if (results[0].status === 'success') {
 *   console.log('Balance:', results[0].result);
 * }
 * ```
 *
 * @param client - Viem public client configured for the target chain
 * @param config - Configuration object containing contracts array and options
 * @param config.contracts - Array of contract calls to execute
 * @param config.allowPartialFailure - If true, returns failures in results; if false, throws on any failure
 * @param config.errorMessages - Custom error messages for each call
 * @returns Promise resolving to array of results, one for each contract call
 * @throws Error if allowPartialFailure is false and any call fails
 *
 * @public
 */
export async function multicall(
  client: PublicClient,
  config: {
    contracts: readonly ContractCall[];
    allowPartialFailure?: boolean;
    errorMessages?: string[];
  }
): Promise<MulticallResult[]> {
  const { contracts, allowPartialFailure = false, errorMessages = [] } = config;

  if (!client) {
    throw new Error('Public client is required for multicall');
  }

  if (!contracts || contracts.length === 0) {
    throw new Error('At least one contract call is required');
  }

  try {
    // biome-ignore lint/suspicious/noExplicitAny: viem's multicall requires specific contract type structure
    const results = await viemMulticall(client as any, {
      // biome-ignore lint/suspicious/noExplicitAny: viem's multicall requires specific ABI type
      contracts: contracts as any,
    });

    return results.map((result, index): MulticallResult => {
      if (result.status === 'success') {
        return {
          status: 'success',
          result: result.result,
        } as MulticallSuccess;
      }

      const failureError =
        result.status === 'failure' && 'error' in result
          ? (result.error as Error)
          : new Error('Unknown error');

      const error = new Error(
        errorMessages[index] ||
          `Contract call ${index} failed: ${failureError.message || 'Unknown error'}`
      );

      if (!allowPartialFailure) {
        throw error;
      }

      return {
        status: 'failure',
        error,
      } as MulticallFailure;
    });
  } catch (error) {
    // Re-throw if it's already our error or if allowPartialFailure is false
    if (
      error instanceof Error &&
      (error.message.includes('Contract call') || error.message.includes('required'))
    ) {
      throw error;
    }

    // Wrap unexpected errors
    throw new Error(
      `Multicall execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Unwraps multicall results, throwing an error if any call failed.
 * Use this helper when you want to ensure all calls succeeded and extract
 * the result values in a type-safe way.
 *
 * @example
 * ```typescript
 * const results = await multicall(client, { contracts: [...] });
 * const [balance, supply] = unwrapMulticallResults(results, [
 *   'Failed to fetch balance',
 *   'Failed to fetch supply',
 * ]);
 * ```
 *
 * @param results - Array of multicall results
 * @param errorMessages - Custom error messages for each result
 * @returns Array of unwrapped result values
 * @throws Error if any result has status 'failure'
 *
 * @public
 */
export function unwrapMulticallResults<T = unknown>(
  results: MulticallResult[],
  errorMessages: string[] = []
): T[] {
  return results.map((result, index): T => {
    if (result.status === 'success') {
      return result.result as T;
    }

    throw new Error(
      errorMessages[index] || result.error.message || `Call ${index} failed: Unknown error`
    );
  });
}

/**
 * Type guard to check if a multicall result is successful
 *
 * @example
 * ```typescript
 * const results = await multicall(client, { contracts: [...], allowPartialFailure: true });
 * const successfulResults = results.filter(isMulticallSuccess);
 * ```
 *
 * @param result - Multicall result to check
 * @returns True if result is successful
 *
 * @public
 */
export function isMulticallSuccess<T = unknown>(
  result: MulticallResult<T>
): result is MulticallSuccess<T> {
  return result.status === 'success';
}

/**
 * Type guard to check if a multicall result is a failure
 *
 * @example
 * ```typescript
 * const results = await multicall(client, { contracts: [...], allowPartialFailure: true });
 * const failures = results.filter(isMulticallFailure);
 * failures.forEach(f => console.error(f.error));
 * ```
 *
 * @param result - Multicall result to check
 * @returns True if result is a failure
 *
 * @public
 */
export function isMulticallFailure(result: MulticallResult): result is MulticallFailure {
  return result.status === 'failure';
}

// Re-export types
export type {
  ContractCall,
  MulticallFailure,
  MulticallOptions,
  MulticallResult,
  MulticallSuccess,
} from './types.js';

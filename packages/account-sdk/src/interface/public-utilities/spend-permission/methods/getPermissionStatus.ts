import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
} from ':core/namespaces/eip155/eip1193/sub-account/constants.js';
import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { getClient } from ':core/namespaces/eip155/client/index.js';
import { http, PublicClient, createPublicClient } from 'viem';
import { multicall, unwrapMulticallResults } from '../../multicall/index.js';
import { timestampInSecondsToDate, toSpendPermissionArgs } from '../utils.js';
import { getPublicClientFromChainId } from '../utils.node.js';
import { withTelemetry } from '../withTelemetry.js';

export type GetPermissionStatusResponseType = {
  remainingSpend: bigint;
  nextPeriodStart: Date;
  isRevoked: boolean;
  isExpired: boolean;
  isActive: boolean;
  isApprovedOnchain: boolean;
  currentPeriod: {
    start: number;
    end: number;
    spend: bigint;
  };
};

/**
 * Gets the current status of a spend permission.
 *
 * This helper method queries the blockchain to retrieve real-time information
 * about a spend permission, including how much can still be spent in the current
 * period, when the next period starts, and whether the permission is still active.
 *
 * The function automatically uses the appropriate blockchain client based on the
 * permission's chain ID and calls multiple view functions on the SpendPermissionManager
 * contract to gather comprehensive status information.
 *
 * When the spend permission does not have a chainId, the function will throw an error.
 *
 * @param permission - The spend permission object to check status for.
 * @param options - Optional configuration options.
 * @param options.rpcUrl - Optional custom RPC URL to use for blockchain queries. Useful for avoiding rate limits on public endpoints.
 *
 * @returns A promise that resolves to an object containing permission status details.
 *
 * @example
 * ```typescript
 * import { getPermissionStatus } from '@base-org/account/spend-permission';
 *
 * // Check the status of a permission (no client needed)
 * const status = await getPermissionStatus(permission);
 *
 * // With custom RPC URL to avoid rate limits
 * const status = await getPermissionStatus(permission, {
 *   rpcUrl: 'https://my-custom-rpc.example.com'
 * });
 *
 * console.log(`Remaining spend: ${status.remainingSpend} wei`);
 * console.log(`Next period starts: ${status.nextPeriodStart}`);
 * console.log(`Is revoked: ${status.isRevoked}`);
 * console.log(`Is expired: ${status.isExpired}`);
 * console.log(`Is active: ${status.isActive}`);
 *
 * if (status.isActive && status.remainingSpend > BigInt(0)) {
 *   console.log('Permission can be used for spending');
 * }
 * ```
 */
const getPermissionStatusFn = async (
  permission: SpendPermission,
  options?: { rpcUrl?: string }
): Promise<GetPermissionStatusResponseType> => {
  const { chainId } = permission;
  const { rpcUrl } = options ?? {};

  if (!chainId) {
    throw new Error('chainId is missing in the spend permission');
  }

  let client: PublicClient | undefined;

  // If a custom RPC URL is provided, create a client with it
  if (rpcUrl) {
    const viemChain = getPublicClientFromChainId(chainId);
    const chain = viemChain?.chain;

    client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  } else {
    // Try to get client from store first (browser environment with connected SDK)
    client = getClient(chainId);

    // If no client in store, create one using the node utility (node environment or disconnected SDK)
    if (!client) {
      client = getPublicClientFromChainId(chainId);
    }
  }

  if (!client) {
    throw new Error(`No client available for chain ID ${chainId}. Chain is not supported.`);
  }

  const spendPermissionArgs = toSpendPermissionArgs(permission);

  // Use multicall to batch all contract reads into a single RPC call
  const results = await multicall(client, {
    contracts: [
      {
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'getCurrentPeriod',
        args: [spendPermissionArgs],
      },
      {
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'isRevoked',
        args: [spendPermissionArgs],
      },
      {
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'isValid',
        args: [spendPermissionArgs],
      },
    ],
    errorMessages: [
      'Failed to fetch current period',
      'Failed to fetch revoked status',
      'Failed to fetch valid status',
    ],
  });

  // Extract results from multicall response
  const [currentPeriod, isRevoked, isValid] = unwrapMulticallResults<
    { start: number; end: number; spend: bigint } | boolean
  >(results, [
    'Failed to fetch current period',
    'Failed to fetch revoked status',
    'Failed to fetch valid status',
  ]) as [{ start: number; end: number; spend: bigint }, boolean, boolean];

  // Calculate remaining spend in current period
  const allowance = BigInt(permission.permission.allowance);
  const spent = currentPeriod.spend;
  const remainingSpend = allowance > spent ? allowance - spent : BigInt(0);

  // Calculate next period start
  // Next period starts immediately after current period ends
  const nextPeriodStart = (Number(currentPeriod.end) + 1).toString();

  // Check if permission is expired
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const isExpired = currentTimestamp > permission.permission.end;

  // Permission is active if it's not revoked and not expired
  const isActive = !isRevoked && !isExpired;

  // isApprovedOnchain indicates if the permission has been approved on the blockchain and is not revoked
  const isApprovedOnchain = isValid;

  return {
    remainingSpend,
    nextPeriodStart: timestampInSecondsToDate(Number(nextPeriodStart)),
    isRevoked,
    isExpired,
    isActive,
    isApprovedOnchain,
    currentPeriod,
  };
};

export const getPermissionStatus = withTelemetry(getPermissionStatusFn);

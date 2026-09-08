import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
} from ':core/namespaces/eip155/eip1193/sub-account/constants.js';
import { getClient } from ':core/namespaces/eip155/client/index.js';
import { readContract } from 'viem/actions';
import { SpendPermissionTypedData } from '../utils.js';
import { withTelemetry } from '../withTelemetry.js';

/**
 * Gets the hash of a spend permission from the SpendPermissionManager contract.
 *
 * This function calls the getHash method on the SpendPermissionManager contract
 * to compute the unique hash for a given spend permission. This hash can be used
 * to identify the permission on-chain.
 *
 * @param params - The parameters for the getHash method.
 * @param params.permission - The spend permission message object from the typed data that
 * contains all permission details.
 * @param params.chainId - The chain ID to use for the contract call
 *
 * @returns A promise that resolves to the permission hash as a hex string
 *
 * @example
 * ```typescript
 * import { getHash } from '@base-org/account/spend-permission';
 *
 * const permission = {
 *   account: '0x1234...',
 *   spender: '0x5678...',
 *   token: '0xabcd...',
 *   allowance: '1000000', // 1 USDC (6 decimals)
 *   period: 86400 * 30, // 30 days in seconds
 *   start: Date.now(),
 *   end: Date.now() + (86400 * 365),
 *   salt: '0x1234567890abcdef...',
 *   extraData: '0x'
 * };
 *
 * const hash = await getHash(permission, 8453); // Base mainnet
 * console.log('Permission hash:', hash);
 * ```
 */
const getHashFn = async ({
  permission,
  chainId,
}: {
  permission: SpendPermissionTypedData['message'];
  chainId: number;
}): Promise<`0x${string}`> => {
  const client = getClient(chainId);

  if (!client) {
    throw new Error(
      `No client found for chain ID ${chainId}. Chain not supported or RPC URL not available`
    );
  }

  const spendPermissionArgs = {
    ...permission,
    allowance: BigInt(permission.allowance),
    salt: BigInt(permission.salt),
  };

  const hash = await readContract(client, {
    address: spendPermissionManagerAddress,
    abi: spendPermissionManagerAbi,
    functionName: 'getHash',
    args: [spendPermissionArgs],
  });

  return hash;
};

export const getHash = withTelemetry(getHashFn);

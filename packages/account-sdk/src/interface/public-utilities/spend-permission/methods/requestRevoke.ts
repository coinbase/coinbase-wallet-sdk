import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
} from ':core/sub-account/constants.js';
import { ProviderInterface } from ':core/provider/interface.js';
import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { Hex, encodeFunctionData, numberToHex } from 'viem';
import { toSpendPermissionArgs } from '../utils.js';
import { withTelemetry } from '../withTelemetry.js';

/**
 * Requests user approval to revoke a spend permission.
 *
 * This helper method opens a popup to ask the user to revoke a spend permission.
 * It requires no additional setup from the app side and handles the entire revoke
 * flow by calling the smart contract's revoke function through wallet_sendCalls.
 *
 * If you're looking for a silent revoke that doesn't require user interaction,
 * use `prepareRevokeCallData` instead, which requires extra configuration.
 *
 * @param params - The parameters for the requestRevoke method.
 * @param params.permission - The spend permission object to revoke. Must include a valid chainId.
 * @param params.provider - The provider interface used to make the wallet_sendCalls request.
 *
 * @returns A promise that resolves to the transaction hash as a hex string.
 *
 * @example
 * ```typescript
 * import { requestRevoke } from '@base-org/account/spend-permission';
 *
 * // Revoke a spend permission with user approval
 * try {
 *   const hash = await requestRevoke({ permission, provider });
 *   console.log(`Permission revoked in transaction: ${hash}`);
 * } catch (error) {
 *   console.error('Failed to revoke permission:', error);
 * }
 * ```
 */
const requestRevokeFn = async ({
  provider,
  permission,
}: {
  provider: ProviderInterface;
  permission: SpendPermission;
}): Promise<Hex> => {
  const { chainId } = permission;

  if (!chainId) {
    throw new Error('chainId is required in the spend permission');
  }

  const spendPermissionArgs = toSpendPermissionArgs(permission);
  const data = encodeFunctionData({
    abi: spendPermissionManagerAbi,
    functionName: 'revoke',
    args: [spendPermissionArgs],
  });

  const call = {
    to: spendPermissionManagerAddress,
    data,
  };

  const result = (await provider.request({
    method: 'wallet_sendCalls',
    params: [
      {
        version: '2.0.0',
        from: permission.permission.account,
        chainId: numberToHex(chainId),
        atomicRequired: true,
        calls: [call],
      },
    ],
  })) as Hex;

  return result;
};

export const requestRevoke = withTelemetry(requestRevokeFn);

import { spendPermissionManagerAbi, spendPermissionManagerAddress } from '../constants.js';
import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { Address, Hex, encodeFunctionData } from 'viem';
import { toSpendPermissionArgs } from '../utils.js';
import { withTelemetry } from '../withTelemetry.js';

type RevokeSpendPermissionResponse = {
  to: Address;
  data: Hex;
  value: bigint;
};

/**
 * Prepares call data for revoking a spend permission without user interaction.
 *
 * This helper method generates the encoded transaction data needed to revoke a spend
 * permission silently, without opening a popup or requiring user approval. This is
 * useful for automated or programmatic revocations where user interaction is not desired.
 *
 * The returned call data can be used with other transaction methods or batch operations.
 *
 * If you need simpler revoke flow, use `requestRevoke` instead, which opens a popup to ask
 * the user to revoke the permission.
 *
 * @param permission - The spend permission object containing the permission details to revoke.
 *
 * @returns A promise that resolves to an object containing the contract address and encoded call data.
 *
 * @example
 * ```typescript
 * import { prepareRevokeCallData } from '@base-org/account/spend-permission';
 *
 * // Prepare revoke call data for silent execution
 * const { to, data } = await prepareRevokeCallData({ permission: myPermission });
 *
 * // Use the call data in a batch transaction or other context
 * const call = {
 *   to,
 *   data,
 *   value: 0n
 * };
 * ```
 */
const prepareRevokeCallDataFn = async (
  permission: SpendPermission
): Promise<RevokeSpendPermissionResponse> => {
  const spendPermissionArgs = toSpendPermissionArgs(permission);
  const data = encodeFunctionData({
    abi: spendPermissionManagerAbi,
    functionName: 'revokeAsSpender',
    args: [spendPermissionArgs],
  });

  const response: RevokeSpendPermissionResponse = {
    to: spendPermissionManagerAddress,
    data,
    value: 0n,
  };

  return response;
};

export const prepareRevokeCallData = withTelemetry(prepareRevokeCallDataFn);

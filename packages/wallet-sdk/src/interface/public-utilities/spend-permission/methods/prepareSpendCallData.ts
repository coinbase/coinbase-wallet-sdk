import { spendPermissionManagerAbi, spendPermissionManagerAddress } from '../constants.js';
import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { Address, Hex, encodeFunctionData } from 'viem';

import { toSpendPermissionArgs } from '../utils.js';
import { withTelemetry } from '../withTelemetry.js';
import { getPermissionStatus } from './getPermissionStatus.js';

type Call = {
  to: Address;
  data: Hex;
  value: bigint;
};

export type PrepareSpendCallDataResponseType = Call[];

/**
 * Prepares call data for approving and spending a spend permission.
 *
 * This helper method constructs the call data for `approveWithSignature`
 * and `spend` functions. The approve call is only included when the permission
 * is not yet approved onchain. If the permission is already approved, only the spend call is returned.
 *
 * When 'max-remaining-allowance' is provided as the amount, the function automatically uses all remaining
 * spend permission allowance.
 *
 * If a recipient address is provided, an ERC20 transfer call will be appended to transfer
 * the spent tokens to the recipient.
 *
 * The resulting call data must be sent using the spender account, not the
 * account holder. The spender is responsible for executing both the approval
 * and spend operations.
 *
 * @param permission - The spend permission object containing the permission details and signature.
 * @param amount - The amount to spend in wei. If 'max-remaining-allowance' is provided, the full remaining allowance will be spent.
 * @param recipient - Optional recipient address to receive the spent tokens via ERC20 transfer.
 * @param options - Optional configuration options.
 * @param options.rpcUrl - Optional custom RPC URL to use for blockchain queries. Useful for avoiding rate limits on public endpoints.
 *
 * @returns A promise that resolves to an array containing all the necessary calls.
 *
 * @throws {Error} Throws an error if the spend permission has been revoked.
 * @throws {Error} Throws an error if the spend amount is 0.
 * @throws {Error} Throws an error if the spend amount exceeds the remaining allowance.
 *
 * @example
 * ```typescript
 * import { prepareSpendCallData } from '@coinbase/wallet-sdk/spend-permission';
 *
 * // Prepare calls to approve and spend a specific amount from a permission
 * const spendCalls = await prepareSpendCallData(
 *   permission, // from requestSpendPermission or fetchPermissions
 *   50n * 10n ** 6n // spend 50 USDC (6 decimals)
 * );
 *
 * // To spend all remaining allowance, use 'max-remaining-allowance'
 * const callsFullAmount = await prepareSpendCallData(
 *   permission,
 *   'max-remaining-allowance'
 * );
 *
 * // Prepare calls with a recipient to receive the tokens
 * const callsWithRecipient = await prepareSpendCallData(
 *   permission,
 *   50n * 10n ** 6n,
 *   '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8' // recipient address
 * );
 *
 * // With custom RPC URL to avoid rate limits
 * const callsWithCustomRpc = await prepareSpendCallData(
 *   permission,
 *   50n * 10n ** 6n,
 *   undefined,
 *   { rpcUrl: 'https://my-custom-rpc.example.com' }
 * );
 *
 * // Send the calls using your app's spender account
 * // this is an example of how to send the calls using the wallet_sendCalls method
 * await provider.request({
 *   method: 'wallet_sendCalls',
 *   params: [{
 *     version: '2.0.0',
 *     atomicRequired: true,
 *     from: permission.permission.spender, // Must be the spender!
 *     chainId: `0x${permission.chainId?.toString(16)}`,
 *     calls: spendCalls,
 *   }],
 * });
 *
 * // Or send the calls using eth_sendTransaction to submit both calls in exact order
 * const promises = spendCalls.map((call) => provider.request({
 *   method: 'eth_sendTransaction',
 *   params: [
 *     {
 *       ...call,
 *       from: permission.permission.spender, // Must be the spender!
 *     }
 *   ]
 * }))
 *
 * await Promise.all(promises);
 * ```
 */
// ERC20 transfer function ABI for recipient transfers
const ERC20_TRANSFER_ABI = [
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
] as const;

const prepareSpendCallDataFn = async (
  permission: SpendPermission,
  amount: bigint | 'max-remaining-allowance',
  recipient?: Address,
  options?: { rpcUrl?: string }
): Promise<PrepareSpendCallDataResponseType> => {
  const { remainingSpend, isApprovedOnchain, isRevoked } = await getPermissionStatus(
    permission,
    options
  );

  if (isRevoked) {
    throw new Error('Spend permission has been revoked');
  }

  const spendAmount = amount === 'max-remaining-allowance' ? remainingSpend : amount;

  if (spendAmount === BigInt(0)) {
    throw new Error('Spend amount cannot be 0');
  }

  if (spendAmount > remainingSpend) {
    throw new Error('Remaining spend amount is insufficient');
  }

  let approveCall: Call | null = null;

  const spendPermissionArgs = toSpendPermissionArgs(permission);

  if (!isApprovedOnchain) {
    const approveData = encodeFunctionData({
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: [spendPermissionArgs, permission.signature as `0x${string}`],
    });
    approveCall = {
      to: spendPermissionManagerAddress,
      data: approveData,
      value: 0n,
    };
  }

  const spendData = encodeFunctionData({
    abi: spendPermissionManagerAbi,
    functionName: 'spend',
    args: [spendPermissionArgs, spendAmount],
  });
  const spendCall: Call = {
    to: spendPermissionManagerAddress,
    data: spendData,
    value: 0n,
  };

  const calls: Call[] = [approveCall, spendCall].filter((item) => item !== null);

  // If a recipient is specified, add an ERC20 transfer call
  if (recipient) {
    // Encode the ERC20 transfer call data
    const transferCallData = encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: 'transfer',
      args: [recipient, spendAmount],
    });

    // Add the transfer call to the result
    calls.push({
      to: permission.permission.token as Address,
      data: transferCallData,
      value: 0n,
    });
  }

  return calls;
};

export const prepareSpendCallData = withTelemetry(prepareSpendCallDataFn);

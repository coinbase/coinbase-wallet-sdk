import { parseUnits } from 'viem';
import {
  fetchPermission,
  prepareSpendCallData,
} from '../public-utilities/spend-permission/index.js';
import { TOKENS } from './constants.js';
import type { PrepareChargeOptions, PrepareChargeResult } from './types.js';
import { assertPermissionAuthorization } from './utils/assertPermissionAuthorization.js';
import { validateUSDCBasePermission } from './utils/validateUSDCBasePermission.js';

/**
 * Prepares call data for charging a subscription.
 *
 * This function fetches the subscription (spend permission) details using its ID (permission hash)
 * and prepares the necessary call data to charge the subscription. It wraps the lower-level
 * prepareSpendCallData function with subscription-specific logic.
 *
 * The resulting call data includes:
 * - An approval call (if the permission is not yet active)
 * - A spend call to charge the subscription
 *
 * A subscription ID is not an authorization token by itself. Store IDs server-side against the
 * authenticated user at subscribe time, and pass `expectedSpender` / `expectedPayer` when the ID
 * may come from an untrusted client.
 *
 * @param options - Options for preparing the charge
 * @param options.id - The subscription ID (permission hash) returned from subscribe()
 * @param options.amount - Amount to charge as a string (e.g., "10.50") or 'max-remaining-charge'
 * @param options.testnet - Whether this permission is on testnet (Base Sepolia). Defaults to false (mainnet)
 * @param options.recipient - Optional recipient address to receive the charged USDC
 * @param options.rpcUrl - Optional custom RPC URL to use for blockchain queries. Useful for avoiding rate limits on public endpoints.
 * @param options.expectedSpender - Optional address that must match the subscription spender
 * @param options.expectedPayer - Optional address that must match the subscription payer
 * @returns Promise<PrepareChargeResult> - Array of call data for the charge
 * @throws Error if the subscription cannot be found or if the amount exceeds remaining allowance
 *
 * @example
 * ```typescript
 * import { base } from '@coinbase/wallet-sdk/payment';
 *
 * // Prepare to charge a specific amount from a subscription
 * const chargeCalls = await base.subscription.prepareCharge({
 *   id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
 *   amount: '9.99',
 *   testnet: false,
 *   expectedSpender: subscriptionOwner,
 *   expectedPayer: authenticatedUserAddress,
 * });
 *
 * // Prepare to charge the full remaining charge
 * const maxChargeCalls = await base.subscription.prepareCharge({
 *   id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
 *   amount: 'max-remaining-charge'
 * });
 *
 * // Prepare to charge and transfer to a recipient
 * const chargeWithRecipient = await base.subscription.prepareCharge({
 *   id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
 *   amount: '10.00',
 *   recipient: '0x0000000000000000000000000000000000000001'
 * });
 *
 * // With custom RPC URL to avoid rate limits
 * const chargeWithCustomRpc = await base.subscription.prepareCharge({
 *   id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
 *   amount: '9.99',
 *   testnet: false,
 *   rpcUrl: 'https://my-custom-rpc.example.com'
 * });
 *
 * // Send the calls using your app's spender account
 * await provider.request({
 *   method: 'wallet_sendCalls',
 *   params: [{
 *     version: '2.0.0',
 *     atomicRequired: true,
 *     from: subscriptionOwner, // Must be the spender/subscription owner!
 *     chainId: testnet ? '0x14a34' : '0x2105',
 *     calls: chargeCalls,
 *   }],
 * });
 * ```
 */
export async function prepareCharge(options: PrepareChargeOptions): Promise<PrepareChargeResult> {
  const {
    id,
    amount,
    testnet = false,
    recipient,
    rpcUrl,
    expectedSpender,
    expectedPayer,
  } = options;

  // Fetch the permission using the subscription ID (permission hash)
  const permission = await fetchPermission({
    permissionHash: id,
  });

  // If no permission found, throw an error
  if (!permission) {
    throw new Error(`Subscription with ID ${id} not found`);
  }

  // Validate this is a USDC permission on the correct network
  validateUSDCBasePermission(permission, testnet);

  // Optionally bind the permission to a known spender and/or payer
  assertPermissionAuthorization(permission, { expectedSpender, expectedPayer });

  // Determine the amount to pass to prepareSpendCallData
  let spendAmount: bigint | 'max-remaining-allowance';

  if (amount === 'max-remaining-charge') {
    // Pass 'max-remaining-allowance' to prepareSpendCallData
    // It will handle getting the permission status internally
    spendAmount = 'max-remaining-allowance';
  } else {
    // Parse the USD amount string to USDC wei (6 decimals)
    // For example, "10.50" becomes 10500000n (10.50 * 10^6)
    spendAmount = parseUnits(amount, TOKENS.USDC.decimals);
  }

  // Call the existing prepareSpendCallData utility with the optional recipient and rpcUrl
  const callData = await prepareSpendCallData(permission, spendAmount, recipient, { rpcUrl });

  return callData;
}

import { type Address } from 'viem';
import { prepareCharge } from './prepareCharge.js';
import type { ChargeOptions, ChargeResult } from './types.js';
import { createCdpClientOrThrow } from './utils/createCdpClientOrThrow.js';
import { getExistingSmartWalletOrThrow } from './utils/getExistingSmartWalletOrThrow.js';
import { sendUserOpAndWait } from './utils/sendUserOpAndWait.js';

/**
 * Prepares and executes a charge for a given spend permission.
 *
 * Note: This function relies on Node.js APIs and is only available in Node.js environments.
 *
 * This function combines the functionality of getOrCreateSubscriptionOwnerWallet and prepareCharge,
 * then executes the charge using a CDP smart wallet. The smart wallet is controlled
 * by an EVM account and can leverage paymasters for gas sponsorship.
 *
 * The function will:
 * - Use the provided CDP credentials or fall back to environment variables
 * - Get the existing smart wallet that acts as the subscription owner
 * - Prepare the charge call data using the subscription ID
 * - Execute the charge transaction using the smart wallet
 * - Optionally use a paymaster for transaction sponsorship
 *
 * @param options - Options for charging the subscription
 * @param options.id - The subscription ID (permission hash) to charge
 * @param options.amount - Amount to charge as a string (e.g., "10.50") or 'max-remaining-charge'
 * @param options.testnet - Whether this is on testnet (Base Sepolia). Defaults to false (mainnet)
 * @param options.cdpApiKeyId - CDP API key ID. Falls back to CDP_API_KEY_ID env var
 * @param options.cdpApiKeySecret - CDP API key secret. Falls back to CDP_API_KEY_SECRET env var
 * @param options.cdpWalletSecret - CDP wallet secret. Falls back to CDP_WALLET_SECRET env var
 * @param options.walletName - Custom wallet name. Defaults to "subscription owner"
 * @param options.paymasterUrl - Paymaster URL for sponsorship. Falls back to PAYMASTER_URL env var
 * @param options.recipient - Optional recipient address to receive the charged USDC
 * @param options.rpcUrl - Optional custom RPC URL to use for blockchain queries. Useful for avoiding rate limits on public endpoints.
 * @param options.expectedPayer - Optional subscriber address that must own the subscription
 * @returns Promise<ChargeResult> - Result of the charge transaction
 * @throws Error if CDP credentials are missing, subscription not found, or charge fails
 *
 * @example
 * ```typescript
 * import { base } from '@coinbase/wallet-sdk/node';
 *
 * // Using environment variables for credentials and paymaster.
 * // Prefer a server-stored subscription id bound to the authenticated user.
 * // Optionally pass expectedPayer to enforce that binding at charge time.
 * const charge = await base.subscription.charge({
 *   id: storedSubscriptionId,
 *   amount: '9.99',
 *   testnet: false,
 *   expectedPayer: authenticatedUserAddress,
 * });
 * console.log(`Charged ${charge.amount} - Transaction: ${charge.id}`);
 *
 * // Using explicit credentials and paymaster URL
 * const charge = await base.subscription.charge({
 *   id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
 *   amount: 'max-remaining-charge',
 *   cdpApiKeyId: 'your-api-key-id',
 *   cdpApiKeySecret: 'your-api-key-secret',
 *   cdpWalletSecret: 'your-wallet-secret',
 *   paymasterUrl: 'https://your-paymaster.com',
 *   testnet: false
 * });
 *
 * // Using a custom wallet name
 * const charge = await base.subscription.charge({
 *   id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
 *   amount: '5.00',
 *   walletName: 'my-app-charge-wallet',
 *   testnet: true
 * });
 *
 * // Charging with a recipient to receive the USDC
 * const charge = await base.subscription.charge({
 *   id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
 *   amount: '10.00',
 *   recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
 *   testnet: false
 * });
 *
 * // With custom RPC URL to avoid rate limits
 * const charge = await base.subscription.charge({
 *   id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
 *   amount: '9.99',
 *   testnet: false,
 *   rpcUrl: 'https://my-custom-rpc.example.com'
 * });
 * ```
 */
export async function charge(options: ChargeOptions): Promise<ChargeResult> {
  const {
    id,
    amount,
    testnet = false,
    cdpApiKeyId,
    cdpApiKeySecret,
    cdpWalletSecret,
    walletName = 'subscription owner',
    paymasterUrl = process.env.PAYMASTER_URL,
    recipient,
    rpcUrl,
    expectedSpender,
    expectedPayer,
  } = options;

  // Step 1: Initialize CDP client with provided credentials or environment variables
  const cdpClient = createCdpClientOrThrow(
    { cdpApiKeyId, cdpApiKeySecret, cdpWalletSecret },
    'subscription charge'
  );

  // Step 2: Get the existing EVM account and smart wallet
  // NOTE: We use get() instead of getOrCreate() to ensure the wallet already exists.
  // The wallet should have been created prior to executing a charge on it.
  const smartWallet = await getExistingSmartWalletOrThrow(cdpClient, walletName, 'charge');

  // Always require the permission spender to be this CDP smart wallet. Callers may also
  // pass expectedSpender explicitly; it must match the wallet used to execute the charge.
  const chargingSpender = smartWallet.address as Address;
  if (expectedSpender && expectedSpender.toLowerCase() !== chargingSpender.toLowerCase()) {
    throw new Error(
      `expectedSpender ${expectedSpender} does not match charging wallet ${chargingSpender}`
    );
  }

  // Step 3: Prepare the charge call data (including optional recipient transfer and custom RPC URL)
  const chargeCalls = await prepareCharge({
    id,
    amount,
    testnet,
    recipient,
    rpcUrl,
    expectedSpender: chargingSpender,
    expectedPayer,
  });

  // Step 4: Get the network-scoped smart wallet
  const network = testnet ? 'base-sepolia' : 'base';
  const networkSmartWallet = await smartWallet.useNetwork(network);

  // Step 5: Execute the charge transaction(s) using the smart wallet
  // Smart wallets can batch multiple calls and use paymasters for gas sponsorship
  // For smart wallets, we can send all calls in a single user operation
  // This is more efficient and allows for better paymaster integration
  const transactionHash = await sendUserOpAndWait(
    networkSmartWallet,
    chargeCalls,
    paymasterUrl,
    60, // Wait up to 60 seconds for the operation to complete
    'charge'
  );

  // Return success result
  return {
    success: true,
    id: transactionHash,
    subscriptionId: id,
    amount: amount === 'max-remaining-charge' ? 'max' : amount,
    subscriptionOwner: smartWallet.address as Address,
    ...(recipient && { recipient }),
  };
}

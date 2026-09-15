import { CdpClient } from '@coinbase/cdp-sdk';
import type {
  GetOrCreateSubscriptionOwnerWalletOptions,
  GetOrCreateSubscriptionOwnerWalletResult,
} from './types.js';

/**
 * Gets or creates a CDP smart wallet to act as the subscription owner (spender).
 *
 * Note: This function relies on Node.js APIs and is only available in Node.js environments.
 *
 * This function creates or retrieves a CDP smart wallet that can be used as the
 * subscriptionOwner when calling the subscribe() function. The smart wallet is
 * controlled by an EVM account (EOA) and can leverage paymasters for gas sponsorship.
 *
 * The function will:
 * - Use the provided CDP credentials or fall back to environment variables
 * - Create or retrieve an EVM account to act as the smart wallet owner
 * - Create or retrieve a smart wallet controlled by that EVM account
 * - Return the smart wallet address (not the EOA address)
 *
 * @param options - Options for getting or creating the subscription owner smart wallet
 * @param options.cdpApiKeyId - CDP API key ID. Falls back to CDP_API_KEY_ID env var
 * @param options.cdpApiKeySecret - CDP API key secret. Falls back to CDP_API_KEY_SECRET env var
 * @param options.cdpWalletSecret - CDP wallet secret. Falls back to CDP_WALLET_SECRET env var
 * @param options.walletName - Custom wallet name. Defaults to "subscription owner"
 * @returns Promise<GetOrCreateSubscriptionOwnerWalletResult> - The smart wallet address and metadata
 * @throws Error if CDP credentials are missing or invalid
 *
 * @example
 * ```typescript
 * import { base } from '@coinbase/wallet-sdk/payment';
 *
 * // Using environment variables (CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET)
 * const owner = await base.subscription.getOrCreateSubscriptionOwnerWallet();
 * console.log(`Subscription owner smart wallet: ${owner.address}`);
 *
 * // Using explicit credentials
 * const owner = await base.subscription.getOrCreateSubscriptionOwnerWallet({
 *   cdpApiKeyId: 'your-api-key-id',
 *   cdpApiKeySecret: 'your-api-key-secret',
 *   cdpWalletSecret: 'your-wallet-secret'
 * });
 *
 * // Use with subscribe function - now uses smart wallet address
 * const subscription = await base.subscription.subscribe({
 *   recurringCharge: "10.50",
 *   subscriptionOwner: owner.address, // Smart wallet address
 *   periodInDays: 30,
 *   testnet: false
 * });
 *
 * // Using a custom wallet name
 * const customOwner = await base.subscription.getOrCreateSubscriptionOwnerWallet({
 *   walletName: 'my-app-subscription-wallet'
 * });
 * ```
 */
export async function getOrCreateSubscriptionOwnerWallet(
  options: GetOrCreateSubscriptionOwnerWalletOptions = {}
): Promise<GetOrCreateSubscriptionOwnerWalletResult> {
  const {
    cdpApiKeyId,
    cdpApiKeySecret,
    cdpWalletSecret,
    walletName = 'subscription owner',
  } = options;

  // Initialize CDP client with provided credentials or environment variables
  let cdpClient: CdpClient;

  try {
    cdpClient = new CdpClient({
      apiKeyId: cdpApiKeyId,
      apiKeySecret: cdpApiKeySecret,
      walletSecret: cdpWalletSecret,
    });
  } catch (error) {
    // Re-throw with more context about what credentials are missing
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to initialize CDP client for subscription owner wallet. ${errorMessage}\n\nPlease ensure you have set the required CDP credentials either:\n1. As environment variables: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET\n2. As function parameters: cdpApiKeyId, cdpApiKeySecret, cdpWalletSecret\n\nYou can get these credentials from https://portal.cdp.coinbase.com/projects/api-keys`
    );
  }

  try {
    // Step 1: Get or create the EVM account that will own the smart wallet
    // This is idempotent - calling multiple times with the same name returns the same wallet
    const eoaAccount = await cdpClient.evm.getOrCreateAccount({ name: walletName });

    // Step 2: Get or create a smart wallet with the EVM account as the owner
    // Using getOrCreateSmartAccount ensures idempotency - the same name and owner
    // will always return the same smart wallet
    // NOTE: Both the EOA wallet and smart wallet are given the same name intentionally.
    // This simplifies wallet management and ensures consistency across the system.
    const smartWallet = await cdpClient.evm.getOrCreateSmartAccount({
      name: walletName, // Same name as the EOA wallet
      owner: eoaAccount,
      // Note: We don't set enableSpendPermissions since this wallet will own/use
      // spend permissions, not grant them to others
    });

    return {
      address: smartWallet.address,
      walletName: walletName,
      eoaAddress: eoaAccount.address, // Include EOA address for reference
    };
  } catch (error) {
    // Handle CDP API errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get or create subscription owner smart wallet "${walletName}": ${errorMessage}`
    );
  }
}

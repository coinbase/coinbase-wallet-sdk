import type { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { CHAIN_IDS, TOKENS } from '../constants.js';

/**
 * Validates that a permission is for USDC on the expected Base network.
 * Throws detailed errors if validation fails.
 *
 * @param permission - The permission to validate
 * @param testnet - Whether this should be testnet (Base Sepolia) or mainnet (Base)
 * @throws Error if chainId or token address doesn't match expected values
 */
export function validateUSDCBasePermission(permission: SpendPermission, testnet: boolean): void {
  // Validate this is a USDC permission on the correct network
  const expectedChainId = testnet ? CHAIN_IDS.baseSepolia : CHAIN_IDS.base;
  const expectedTokenAddress = testnet
    ? TOKENS.USDC.addresses.baseSepolia.toLowerCase()
    : TOKENS.USDC.addresses.base.toLowerCase();

  if (permission.chainId !== expectedChainId) {
    // Determine if the subscription is on mainnet or testnet
    const isSubscriptionOnMainnet = permission.chainId === CHAIN_IDS.base;
    const isSubscriptionOnTestnet = permission.chainId === CHAIN_IDS.baseSepolia;

    let errorMessage: string;
    if (testnet && isSubscriptionOnMainnet) {
      errorMessage =
        'The subscription was requested on testnet but is actually a mainnet subscription';
    } else if (!testnet && isSubscriptionOnTestnet) {
      errorMessage =
        'The subscription was requested on mainnet but is actually a testnet subscription';
    } else {
      // Fallback for unexpected chain IDs
      errorMessage = `Subscription is on chain ${permission.chainId}, expected ${expectedChainId} (${testnet ? 'Base Sepolia' : 'Base'})`;
    }

    throw new Error(errorMessage);
  }

  if (permission.permission.token.toLowerCase() !== expectedTokenAddress) {
    throw new Error(
      `Subscription is not for USDC token. Got ${permission.permission.token}, expected ${expectedTokenAddress}`
    );
  }
}

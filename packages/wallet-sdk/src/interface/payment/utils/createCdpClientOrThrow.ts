import { CdpClient } from '@coinbase/cdp-sdk';

/**
 * Options for creating a CDP client
 */
export interface CreateCdpClientOptions {
  cdpApiKeyId?: string;
  cdpApiKeySecret?: string;
  cdpWalletSecret?: string;
}

/**
 * Creates and initializes a CDP client with provided credentials or environment variables.
 * Throws a detailed error if credentials are missing or invalid.
 *
 * @param options - CDP credential options
 * @param context - Context string for error messages (e.g., "subscription charge", "subscription revoke")
 * @returns Initialized CdpClient instance
 * @throws Error if credentials are missing or invalid
 */
export function createCdpClientOrThrow(
  options: CreateCdpClientOptions,
  context: string
): CdpClient {
  try {
    return new CdpClient({
      apiKeyId: options.cdpApiKeyId,
      apiKeySecret: options.cdpApiKeySecret,
      walletSecret: options.cdpWalletSecret,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to initialize CDP client for ${context}. ${errorMessage}\n\nPlease ensure you have set the required CDP credentials either:\n1. As environment variables: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET\n2. As function parameters: cdpApiKeyId, cdpApiKeySecret, cdpWalletSecret\n\nYou can get these credentials from https://portal.cdp.coinbase.com/`
    );
  }
}

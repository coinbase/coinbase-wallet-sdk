/**
 * Utility to dynamically load SDK from npm or use local workspace version
 */

import type { LoadedSDK, SDKLoaderConfig, SDKSource } from '../pages/e2e-test/types';

// Re-export types for backward compatibility
export type { LoadedSDK, SDKLoaderConfig, SDKSource };

/**
 * Load SDK from npm package (published version)
 */
async function loadFromNpm(): Promise<LoadedSDK> {
  // Dynamic import of npm package (installed as @base-org/account-npm alias)
  const mainModule = await import('@base-org/account-npm');
  const npmModule = mainModule as typeof mainModule & {
    createCoinbaseWalletSDK?: LoadedSDK['createCoinbaseWalletSDK'];
    createBaseAccountSDK?: LoadedSDK['createCoinbaseWalletSDK'];
  };

  return {
    createCoinbaseWalletSDK: npmModule.createCoinbaseWalletSDK ?? npmModule.createBaseAccountSDK,
    VERSION: mainModule.VERSION,
  } as unknown as LoadedSDK;
}

/**
 * Load SDK from local workspace (development version)
 */
async function loadFromLocal(): Promise<LoadedSDK> {
  // Dynamic import of local workspace package
  const mainModule = await import('@coinbase/wallet-sdk');

  return {
    createCoinbaseWalletSDK: mainModule.createCoinbaseWalletSDK,
    VERSION: mainModule.VERSION,
  } as unknown as LoadedSDK;
}

/**
 * Main SDK loader function
 */
export async function loadSDK(config: SDKLoaderConfig): Promise<LoadedSDK> {
  if (config.source === 'npm') {
    return loadFromNpm();
  }
  return loadFromLocal();
}

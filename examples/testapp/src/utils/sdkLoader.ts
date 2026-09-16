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
  const spendPermissionModule = await import('@base-org/account-npm/spend-permission');
  const npmModule = mainModule as typeof mainModule & {
    createCoinbaseWalletSDK?: LoadedSDK['createCoinbaseWalletSDK'];
    createBaseAccountSDK?: LoadedSDK['createCoinbaseWalletSDK'];
  };

  return {
    base: mainModule.base,
    createCoinbaseWalletSDK: npmModule.createCoinbaseWalletSDK ?? npmModule.createBaseAccountSDK,
    createProlinkUrl: mainModule.createProlinkUrl,
    decodeProlink: mainModule.decodeProlink,
    encodeProlink: mainModule.encodeProlink,
    VERSION: mainModule.VERSION,
    CHAIN_IDS: mainModule.CHAIN_IDS,
    TOKENS: mainModule.TOKENS,
    getPaymentStatus: mainModule.getPaymentStatus,
    getSubscriptionStatus: mainModule.getSubscriptionStatus,
    spendPermission: {
      fetchPermission: spendPermissionModule.fetchPermission,
      fetchPermissions: spendPermissionModule.fetchPermissions,
      getHash: spendPermissionModule.getHash,
      getPermissionStatus: spendPermissionModule.getPermissionStatus,
      prepareRevokeCallData: spendPermissionModule.prepareRevokeCallData,
      prepareSpendCallData: spendPermissionModule.prepareSpendCallData,
      requestSpendPermission: spendPermissionModule.requestSpendPermission,
    },
  } as unknown as LoadedSDK;
}

/**
 * Load SDK from local workspace (development version)
 */
async function loadFromLocal(): Promise<LoadedSDK> {
  // Dynamic import of local workspace package
  const mainModule = await import('@coinbase/wallet-sdk');
  const spendPermissionModule = await import('@coinbase/wallet-sdk/spend-permission');

  return {
    base: mainModule.base,
    createCoinbaseWalletSDK: mainModule.createCoinbaseWalletSDK,
    createProlinkUrl: mainModule.createProlinkUrl,
    decodeProlink: mainModule.decodeProlink,
    encodeProlink: mainModule.encodeProlink,
    VERSION: mainModule.VERSION,
    CHAIN_IDS: mainModule.CHAIN_IDS,
    TOKENS: mainModule.TOKENS,
    getPaymentStatus: mainModule.getPaymentStatus,
    getSubscriptionStatus: mainModule.getSubscriptionStatus,
    spendPermission: {
      fetchPermission: spendPermissionModule.fetchPermission,
      fetchPermissions: spendPermissionModule.fetchPermissions,
      getHash: spendPermissionModule.getHash,
      getPermissionStatus: spendPermissionModule.getPermissionStatus,
      prepareRevokeCallData: spendPermissionModule.prepareRevokeCallData,
      prepareSpendCallData: spendPermissionModule.prepareSpendCallData,
      requestSpendPermission: spendPermissionModule.requestSpendPermission,
    },
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

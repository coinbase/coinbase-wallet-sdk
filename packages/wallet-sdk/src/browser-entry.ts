/**
 * Browser entry point for Coinbase Wallet SDK
 * This file exposes the account interface to the global window object
 */

import { PACKAGE_VERSION } from './core/constants.js';
import { createCoinbaseWalletSDK } from './interface/builder/createCoinbaseWalletSDK.js';

// Extend Window interface for global exports
declare global {
  interface Window {
    createCoinbaseWalletSDK: typeof createCoinbaseWalletSDK;
    CoinbaseWalletSDK: {
      VERSION: string;
    };
  }
}

// Expose to global window object
if (typeof window !== 'undefined') {
  window.createCoinbaseWalletSDK = createCoinbaseWalletSDK;
  window.CoinbaseWalletSDK = {
    VERSION: PACKAGE_VERSION,
  };
}

// Export for module usage
export type {
  AppMetadata,
  Preference,
  ProviderInterface,
} from ':core/provider/interface.js';
export { PACKAGE_VERSION as VERSION } from './core/constants.js';
export { createCoinbaseWalletSDK } from './interface/builder/createCoinbaseWalletSDK.js';
export type {
  ConnectAccount,
  ConnectNamespaceOptions,
  ConnectOptions,
  ConnectResult,
} from './interface/builder/connect.js';

/**
 * Browser entry point for Coinbase Wallet SDK
 * The UMD bundle exposes this module as `window.CoinbaseWalletSDK`; this file adds the
 * `window.createCoinbaseWalletSDK` shortcut.
 */

import { createCoinbaseWalletSDK } from './interface/builder/createCoinbaseWalletSDK.js';

// Extend Window interface for global exports
declare global {
  interface Window {
    createCoinbaseWalletSDK: typeof createCoinbaseWalletSDK;
  }
}

// Expose to global window object
if (typeof window !== 'undefined') {
  window.createCoinbaseWalletSDK = createCoinbaseWalletSDK;
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

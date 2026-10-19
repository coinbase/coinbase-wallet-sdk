/**
 * Browser entry point for Coinbase Wallet SDK
 * The UMD bundle exposes this module as `window.CoinbaseWalletSDK`; this file adds the
 * `window.createCoinbaseWalletSDK` shortcut.
 */

import { createCoinbaseWalletSDK } from './interface/builder/createCoinbaseWalletSDK.js';

declare global {
  interface Window {
    createCoinbaseWalletSDK: typeof createCoinbaseWalletSDK;
  }
}

if (typeof window !== 'undefined') {
  window.createCoinbaseWalletSDK = createCoinbaseWalletSDK;
}

export * from './index.js';

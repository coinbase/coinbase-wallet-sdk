/**
 * Browser entry point for Coinbase Wallet SDK
 * This file exposes the account interface to the global window object
 */

import { PACKAGE_VERSION } from './core/constants.js';
import { createCoinbaseWalletSDK } from './interface/builder/createCoinbaseWalletSDK.js';
import { base } from './interface/payment/base.browser.js';
import { CHAIN_IDS, TOKENS } from './interface/payment/constants.js';
import { getPaymentStatus } from './interface/payment/getPaymentStatus.js';
import { pay } from './interface/payment/pay.js';
import { subscribe } from './interface/payment/subscribe.js';
import type {
  InfoRequest,
  PayerInfo,
  PaymentOptions,
  PaymentResult,
  PaymentStatus,
  PaymentStatusOptions,
  SubscriptionOptions,
  SubscriptionResult,
} from './interface/payment/types.js';

// Extend Window interface for global exports
declare global {
  interface Window {
    base: typeof base;
    createCoinbaseWalletSDK: typeof createCoinbaseWalletSDK;
    CoinbaseWalletSDK: {
      VERSION: string;
    };
  }
}

// Expose to global window object
if (typeof window !== 'undefined') {
  window.base = base;
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
export { base, CHAIN_IDS, getPaymentStatus, pay, subscribe, TOKENS };
export type {
  InfoRequest,
  PayerInfo,
  PaymentOptions,
  PaymentResult,
  PaymentStatus,
  PaymentStatusOptions,
  SubscriptionOptions,
  SubscriptionResult,
};

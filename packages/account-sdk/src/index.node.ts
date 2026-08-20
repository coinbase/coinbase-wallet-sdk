// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

// Node.js-specific exports that include CDP SDK dependencies
export type { AppMetadata, Preference, ProviderInterface } from ':core/provider/interface.js';

export { createBaseAccountSDK } from './interface/builder/core/createBaseAccountSDK.js';

export { getCryptoKeyAccount, removeCryptoKey } from './owner-key/index.js';

export { PACKAGE_VERSION as VERSION } from './core/constants.js';

// Payment interface exports - Node version with CDP SDK methods
export {
  CHAIN_IDS,
  TOKENS,
  base,
  charge,
  getOrCreateSubscriptionOwnerWallet,
  getPaymentStatus,
  getSubscriptionStatus,
  pay,
  prepareCharge,
  subscribe,
} from './interface/payment/index.node.js';
export type {
  ChargeOptions,
  ChargeResult,
  GetOrCreateSubscriptionOwnerWalletOptions,
  GetOrCreateSubscriptionOwnerWalletResult,
  InfoRequest,
  PayerInfo,
  PayerInfoResponses,
  PaymentOptions,
  PaymentResult,
  PaymentStatus,
  PaymentStatusOptions,
  PaymentStatusType,
  PaymentSuccess,
  PrepareChargeCall,
  PrepareChargeOptions,
  PrepareChargeResult,
  SubscriptionOptions,
  SubscriptionResult,
  SubscriptionStatus,
  SubscriptionStatusOptions,
} from './interface/payment/index.node.js';

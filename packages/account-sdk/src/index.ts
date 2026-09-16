// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>
export type {
  AppMetadata,
  Preference,
  ProviderInterface,
} from ':core/provider/interface.js';

export { createBaseAccountSDK } from './interface/builder/createBaseAccountSDK.js';

export { PACKAGE_VERSION as VERSION } from './core/constants.js';

export {
  base,
  CHAIN_IDS,
  getPaymentStatus,
  getSubscriptionStatus,
  pay,
  prepareCharge,
  subscribe,
  TOKENS,
} from './interface/payment/index.js';
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
} from './interface/payment/index.js';

export {
  createProlinkUrl,
  decodeProlink,
  encodeProlink,
} from './interface/public-utilities/prolink/index.js';
export type {
  ProlinkDecoded,
  ProlinkRequest,
} from './interface/public-utilities/prolink/index.js';

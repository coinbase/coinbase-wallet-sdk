// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>
export type {
  AppMetadata,
  Preference,
  ProviderInterface,
} from ':core/provider/interface.js';

export { createCoinbaseWalletSDK } from './interface/builder/createCoinbaseWalletSDK.js';
export type { ConnectOptions, ConnectResult } from './interface/builder/connect/types.js';

export { PACKAGE_VERSION as VERSION } from './core/constants.js';

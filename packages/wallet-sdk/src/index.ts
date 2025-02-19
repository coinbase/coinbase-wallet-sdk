// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>
import { CoinbaseWalletSDK } from './CoinbaseWalletSDK.js';
export default CoinbaseWalletSDK;

export type { CoinbaseWalletProvider } from './CoinbaseWalletProvider.js';
export { CoinbaseWalletSDK } from './CoinbaseWalletSDK.js';
export { createCoinbaseWalletSDK } from './createCoinbaseWalletSDK.js';
export { getCryptoKeyAccount, removeCryptoKey } from './kms/crypto-key/index.js';
export type { AppMetadata, Preference, ProviderInterface } from ':core/provider/interface.js';

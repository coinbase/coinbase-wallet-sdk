// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
import { ProviderInterface } from './core/type/ProviderInterface';

export { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
export type { ConnectionPreference } from './core/communicator/ConnectionPreference';
export default CoinbaseWalletSDK;

declare global {
  interface Window {
    CoinbaseWalletSDK: typeof CoinbaseWalletSDK;
    CoinbaseWalletProvider: typeof CoinbaseWalletProvider;
    ethereum?: ProviderInterface;
    coinbaseWalletExtension?: ProviderInterface;
  }
}

if (typeof window !== 'undefined') {
  window.CoinbaseWalletSDK = CoinbaseWalletSDK;
  window.CoinbaseWalletProvider = CoinbaseWalletProvider;
}

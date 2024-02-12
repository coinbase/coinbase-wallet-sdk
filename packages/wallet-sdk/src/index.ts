// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
import { CoinbaseWalletProvider } from './provider/CoinbaseWalletProvider';
import { ProviderInterface } from './provider/ProviderInterface';

export { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
export default CoinbaseWalletSDK;

declare global {
  interface Window {
    CoinbaseWalletSDK: typeof CoinbaseWalletSDK;
    CoinbaseWalletProvider: typeof CoinbaseWalletProvider;
    /**
     * For CoinbaseWalletSDK, window.ethereum is `CoinbaseWalletProvider`
     */
    ethereum?: ProviderInterface;
    coinbaseWalletExtension?: ProviderInterface;
  }
}

if (typeof window !== 'undefined') {
  window.CoinbaseWalletSDK = CoinbaseWalletSDK;
  window.CoinbaseWalletProvider = CoinbaseWalletProvider;
}

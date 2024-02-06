// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
import { CoinbaseWalletProvider } from './provider/CoinbaseWalletProvider';
import { EIP1193Provider } from './provider/EIP1193Provider';

export { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
export { CoinbaseWalletProvider } from './provider/CoinbaseWalletProvider';
export default CoinbaseWalletSDK;

declare global {
  interface Window {
    CoinbaseWalletSDK: typeof CoinbaseWalletSDK;
    CoinbaseWalletProvider: typeof EIP1193Provider;
    /**
     * For CoinbaseWalletSDK, window.ethereum is `CoinbaseWalletProvider`
     */
    ethereum?: any;
    coinbaseWalletExtension?: CoinbaseWalletProvider;
  }
}

if (typeof window !== 'undefined') {
  window.CoinbaseWalletSDK = CoinbaseWalletSDK;
  window.CoinbaseWalletProvider = EIP1193Provider;
}

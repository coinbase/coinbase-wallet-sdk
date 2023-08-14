// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { CoinbaseWalletSDK } from './CoinbaseWalletSDK.js';
import { CoinbaseWalletProvider } from './provider/CoinbaseWalletProvider.js';

export { CoinbaseWalletSDK } from './CoinbaseWalletSDK.js';
export { CoinbaseWalletProvider } from './provider/CoinbaseWalletProvider.js';
export default CoinbaseWalletSDK;

declare global {
  interface Window {
    CoinbaseWalletSDK: typeof CoinbaseWalletSDK;
    CoinbaseWalletProvider: typeof CoinbaseWalletProvider;
    /**
     * For CoinbaseWalletSDK, window.ethereum is `CoinbaseWalletProvider`
     */
    ethereum?: any;
    coinbaseWalletExtension?: CoinbaseWalletProvider;

    /**
     * @deprecated Legacy API
     */
    WalletLink: typeof CoinbaseWalletSDK;
    /**
     * @deprecated Legacy API
     */
    WalletLinkProvider: typeof CoinbaseWalletProvider;
    /**
     * @deprecated Legacy API
     */
    walletLinkExtension?: CoinbaseWalletProvider;
  }
}

if (typeof window !== 'undefined') {
  window.CoinbaseWalletSDK = CoinbaseWalletSDK;
  window.CoinbaseWalletProvider = CoinbaseWalletProvider;

  /**
   * @deprecated Use `window.CoinbaseWalletSDK`
   */
  window.WalletLink = CoinbaseWalletSDK;
  /**
   * @deprecated Use `window.CoinbaseWalletProvider`
   */
  window.WalletLinkProvider = CoinbaseWalletProvider;
}

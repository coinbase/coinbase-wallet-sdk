// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
import { ProviderInterface } from './core/type/ProviderInterface';

export { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
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

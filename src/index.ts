// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK"
import { CoinbaseWalletProvider } from "./provider/CoinbaseWalletProvider"

export { CoinbaseWalletSDK } from "./CoinbaseWalletSDK"
export { CoinbaseWalletProvider } from "./provider/CoinbaseWalletProvider"
export default CoinbaseWalletSDK

declare global {
  interface Window {
    CoinbaseWalletSDK: typeof CoinbaseWalletSDK
    CoinbaseWalletProvider: typeof CoinbaseWalletProvider
    ethereum?: CoinbaseWalletProvider
    coinbaseWalletExtension?: CoinbaseWalletProvider

    // deprecated
    WalletLink: typeof CoinbaseWalletSDK
    WalletLinkProvider: typeof CoinbaseWalletProvider
    walletLinkExtension?: CoinbaseWalletProvider
  }
}

if (typeof window !== "undefined") {
  window.CoinbaseWalletSDK = CoinbaseWalletSDK
  window.CoinbaseWalletProvider = CoinbaseWalletProvider

  // deprecated
  window.WalletLink = CoinbaseWalletSDK
  window.WalletLinkProvider = CoinbaseWalletProvider
}

// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK"
import { CBWalletProvider } from "./provider/CBWalletProvider"

export { CoinbaseWalletSDK } from "./CoinbaseWalletSDK"
export { CBWalletProvider } from "./provider/CBWalletProvider"
export default CoinbaseWalletSDK

declare global {
  interface Window {
    CoinbaseWalletSDK: typeof CoinbaseWalletSDK
    CBWalletProvider: typeof CBWalletProvider
    ethereum?: CBWalletProvider
    coinbaseWalletExtension?: CBWalletProvider

    // deprecated
    WalletLink: typeof CoinbaseWalletSDK
    WalletLinkProvider: typeof CBWalletProvider
    walletLinkExtension?: CBWalletProvider
  }
}

if (typeof window !== "undefined") {
  window.CoinbaseWalletSDK = CoinbaseWalletSDK
  window.CBWalletProvider = CBWalletProvider

  // deprecated
  window.WalletLink = CoinbaseWalletSDK
  window.WalletLinkProvider = CBWalletProvider
}

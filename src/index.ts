// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { CoinbaseWallet } from "./CoinbaseWallet"
import { CBWalletProvider } from "./provider/CBWalletProvider"

export { CoinbaseWallet } from "./CoinbaseWallet"
export { CBWalletProvider } from "./provider/CBWalletProvider"
export default CoinbaseWallet

declare global {
  interface Window {
    CoinbaseWallet: typeof CoinbaseWallet
    CBWalletProvider: typeof CBWalletProvider
    ethereum?: CBWalletProvider
    coinbaseWalletExtension?: CBWalletProvider

    // deprecated
    WalletLink: typeof CoinbaseWallet
    WalletLinkProvider: typeof CBWalletProvider
    walletLinkExtension?: CBWalletProvider
  }
}

if (typeof window !== "undefined") {
  window.CoinbaseWallet = CoinbaseWallet
  window.CBWalletProvider = CBWalletProvider

  // deprecated
  window.WalletLink = CoinbaseWallet
  window.WalletLinkProvider = CBWalletProvider
}

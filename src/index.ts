// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { CBWalletProvider } from "./provider/CBWalletProvider"
import { CoinbaseWallet } from "./CoinbaseWallet"

export { CBWalletProvider } from "./provider/CBWalletProvider"
export { CoinbaseWallet } from "./CoinbaseWallet"
export default CoinbaseWallet

declare global {
  interface Window {
    WalletLink: typeof CoinbaseWallet
    WalletLinkProvider: typeof CBWalletProvider
    ethereum?: CBWalletProvider
    walletLinkExtension?: CBWalletProvider
  }
}

if (typeof window !== "undefined") {
  window.WalletLink = CoinbaseWallet
  window.WalletLinkProvider = CBWalletProvider
}

// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { CBWalletProvider } from "./provider/CBWalletProvider"
import { WalletLink } from "./WalletLink"

export { CBWalletProvider } from "./provider/CBWalletProvider"
export { WalletLink } from "./WalletLink"
export default WalletLink

declare global {
  interface Window {
    WalletLink: typeof WalletLink
    WalletLinkProvider: typeof CBWalletProvider
    ethereum?: CBWalletProvider
    walletLinkExtension?: CBWalletProvider
  }
}

if (typeof window !== "undefined") {
  window.WalletLink = WalletLink
  window.WalletLinkProvider = CBWalletProvider
}

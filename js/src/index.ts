// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { WalletLinkProvider } from "./provider/WalletLinkProvider"
import { WalletLink } from "./WalletLink"

export { WalletLinkProvider } from "./provider/WalletLinkProvider"
export { WalletLink } from "./WalletLink"
export default WalletLink

declare global {
  interface Window {
    WalletLink: typeof WalletLink
    WalletLinkProvider: typeof WalletLinkProvider
    ethereum?: WalletLinkProvider
    walletLinkExtension?: WalletLinkProvider
  }
}

if (typeof window !== "undefined") {
  window.WalletLink = WalletLink
  window.WalletLinkProvider = WalletLinkProvider
}

// Copyright (c) 2018-2019 Coinbase, Inc.
// Licensed under the Apache License, version 2.0.

import { WalletLink } from "./WalletLink"
import { WalletLinkProvider } from "./WalletLinkProvider"

declare global {
  interface Window {
    WalletLink: typeof WalletLink
    ethereum: WalletLinkProvider
  }
}

if (typeof window !== "undefined") {
  window.WalletLink = WalletLink
}

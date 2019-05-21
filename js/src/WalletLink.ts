// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { WalletLinkProvider } from "./WalletLinkProvider"
import { WalletLinkRelay } from "./WalletLinkRelay"

const WALLETLINK_WEB_URL = process.env.WALLETLINK_WEB_URL!

export interface WalletLinkOptions {
  appName?: string
  walletLinkWebUrl?: string
}

export class WalletLink {
  private _appName?: string
  private _relay: WalletLinkRelay

  constructor(options: WalletLinkOptions) {
    this._appName = options.appName || "DApp"
    this._relay = new WalletLinkRelay(
      options.walletLinkWebUrl || WALLETLINK_WEB_URL
    )
    this._relay.injectIframe()
  }

  public makeWeb3Provider(
    jsonRpcUrl: string,
    chainId: number = 1
  ): WalletLinkProvider {
    return new WalletLinkProvider({
      relay: this._relay,
      appName: this._appName,
      jsonRpcUrl,
      chainId
    })
  }
}

// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { WalletLinkNotification } from "./WalletLinkNotification"
import { WalletLinkProvider } from "./WalletLinkProvider"
import { WalletLinkRelay } from "./WalletLinkRelay"

const WALLETLINK_WEB_URL = process.env.WALLETLINK_WEB_URL!

export interface WalletLinkOptions {
  appName?: string
  appLogoUrl?: string
  walletLinkWebUrl?: string
}

export class WalletLink {
  private _appName: string
  private _appLogoUrl: string | null = null
  private _relay: WalletLinkRelay

  constructor(options: WalletLinkOptions) {
    this._appName = options.appName || "DApp"
    this._appLogoUrl = options.appLogoUrl || null
    this._relay = new WalletLinkRelay(
      options.walletLinkWebUrl || WALLETLINK_WEB_URL
    )
    WalletLinkNotification.injectContainer()
    this._relay.injectIframe()
  }

  public makeWeb3Provider(
    jsonRpcUrl: string,
    chainId: number = 1
  ): WalletLinkProvider {
    return new WalletLinkProvider({
      relay: this._relay,
      appName: this._appName,
      appLogoUrl: this._appLogoUrl,
      jsonRpcUrl,
      chainId
    })
  }
}

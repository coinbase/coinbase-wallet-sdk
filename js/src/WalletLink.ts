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
  private _appLogoUrl: string
  private _relay: WalletLinkRelay

  constructor(options: WalletLinkOptions) {
    this._appName = options.appName || "DApp"
    this._appLogoUrl = options.appLogoUrl || this._getFavicon()
    this._relay = new WalletLinkRelay({
      appName: this._appName,
      appLogoUrl: this._appLogoUrl,
      walletLinkWebUrl: options.walletLinkWebUrl || WALLETLINK_WEB_URL
    })
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
      jsonRpcUrl,
      chainId
    })
  }

  private _getFavicon(): string {
    const el =
      document.querySelector('link[sizes="192x192"]') ||
      document.querySelector('link[sizes="180x180"]') ||
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]')

    const { protocol, host } = document.location
    const href = el ? el.getAttribute("href") : null
    if (!href || href.startsWith("javascript:")) {
      return ""
    }
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("data:")
    ) {
      return href
    }
    if (href.startsWith("//")) {
      return protocol + href
    }
    return `${protocol}//${host}${href}`
  }
}

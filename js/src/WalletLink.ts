// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { WalletLinkNotification } from "./WalletLinkNotification"
import { WalletLinkProvider } from "./WalletLinkProvider"
import { WalletLinkRelay } from "./WalletLinkRelay"

const WALLETLINK_URL =
  process.env.WALLETLINK_URL! || "https://www.walletlink.org"
const WALLETLINK_VERSION =
  process.env.WALLETLINK_VERSION! ||
  require("../package.json").version ||
  "unknown"

export interface WalletLinkOptions {
  appName?: string
  appLogoUrl?: string
  walletLinkUrl?: string
}

export class WalletLink {
  public static VERSION = WALLETLINK_VERSION

  private _appName: string
  private _appLogoUrl: string
  private _relay: WalletLinkRelay

  constructor(options: Readonly<WalletLinkOptions>) {
    this._appName = options.appName || "DApp"
    this._appLogoUrl = options.appLogoUrl || getFavicon()
    this._relay = new WalletLinkRelay({
      appName: this._appName,
      appLogoUrl: this._appLogoUrl,
      walletLinkUrl: options.walletLinkUrl || WALLETLINK_URL
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
      jsonRpcUrl,
      chainId
    })
  }

  public setAppInfo(
    info: { appName?: string; appLogoUrl?: string } = {}
  ): void {
    this._appName = info.appName || "DApp"
    this._appLogoUrl = info.appLogoUrl || getFavicon()
    this._relay.setAppInfo(this._appName, this._appLogoUrl)
  }
}

function getFavicon(): string {
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

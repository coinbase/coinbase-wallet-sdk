// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { injectCssReset } from "./lib/cssReset"
import { WalletLinkProvider } from "./provider/WalletLinkProvider"
import { WalletLinkRelay } from "./relay/WalletLinkRelay"

const WALLETLINK_URL =
  process.env.WALLETLINK_URL! || "https://www.walletlink.org"
const WALLETLINK_VERSION =
  process.env.WALLETLINK_VERSION! ||
  require("../package.json").version ||
  "unknown"

export interface WalletLinkOptions {
  appName?: string
  appLogoUrl?: string | null
  walletLinkUrl?: string
  walletLinkServerUrl?: string
}

export class WalletLink {
  public static VERSION = WALLETLINK_VERSION

  private _appName = ""
  private _appLogoUrl: string | null = null
  private _relay: WalletLinkRelay

  constructor(options: Readonly<WalletLinkOptions>) {
    this._relay = new WalletLinkRelay({
      walletLinkUrl: options.walletLinkUrl || WALLETLINK_URL,
      version: WALLETLINK_VERSION
    })
    this.setAppInfo(options.appName, options.appLogoUrl)
    this._relay.attach(document.documentElement)
    injectCssReset()
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
    appName: string | undefined,
    appLogoUrl: string | null | undefined
  ): void {
    this._appName = appName || "DApp"
    this._appLogoUrl = appLogoUrl || getFavicon()
    this._relay.setAppInfo(this._appName, this._appLogoUrl)
  }

  /**
   * Disconnect. After disconnecting, this will reload the web page to ensure
   * all potential stale state is cleared.
   */
  public disconnect(): void {
    this._relay.resetAndReload()
  }
}

function getFavicon(): string | null {
  const el =
    document.querySelector('link[sizes="192x192"]') ||
    document.querySelector('link[sizes="180x180"]') ||
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]')

  const { protocol, host } = document.location
  const href = el ? el.getAttribute("href") : null
  if (!href || href.startsWith("javascript:")) {
    return null
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

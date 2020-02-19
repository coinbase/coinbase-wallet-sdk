// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { injectCssReset } from "./lib/cssReset"
import { WalletLinkProvider } from "./provider/WalletLinkProvider"
import { WalletLinkRelay } from "./relay/WalletLinkRelay"
import { getFavicon } from "./util"

const WALLETLINK_URL =
  process.env.WALLETLINK_URL! || "https://www.walletlink.org"
const WALLETLINK_VERSION =
  process.env.WALLETLINK_VERSION! ||
  require("../package.json").version ||
  "unknown"

/** WalletLink Constructor Options */
export interface WalletLinkOptions {
  /** Application name */
  appName: string
  /** @optional Application logo image URL; favicon is used if unspecified */
  appLogoUrl?: string | null
  /** @optional Use dark theme */
  darkMode?: boolean
  /** @optional WalletLink server URL; for most, leave it unspecified */
  walletLinkUrl?: string
}

export class WalletLink {
  /**
   * WalletLink version
   */
  public static VERSION = WALLETLINK_VERSION

  private _appName = ""
  private _appLogoUrl: string | null = null
  private _relay: WalletLinkRelay

  /**
   * Constructor
   * @param options WalletLink options object
   */
  constructor(options: Readonly<WalletLinkOptions>) {
    this._relay = new WalletLinkRelay({
      walletLinkUrl: options.walletLinkUrl || WALLETLINK_URL,
      version: WALLETLINK_VERSION,
      darkMode: !!options.darkMode
    })
    this.setAppInfo(options.appName, options.appLogoUrl)
    this._relay.attach(document.documentElement)
    injectCssReset()
  }

  /**
   * Create a Web3 Provider object
   * @param jsonRpcUrl Ethereum JSON RPC URL
   * @param chainId Ethereum Chain ID (Default: 1)
   * @returns A Web3 Provider
   */
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

  /**
   * Set application information
   * @param appName Application name
   * @param appLogoUrl Application logo image URL
   */
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

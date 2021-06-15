// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import url from "url"
import { ScopedLocalStorage } from "./lib/ScopedLocalStorage"
import { WalletLinkProvider } from "./provider/WalletLinkProvider"
import { WalletLinkSdkUI } from "./provider/WalletLinkSdkUI"
import { WalletLinkUI, WalletLinkUIOptions } from "./provider/WalletLinkUI"
import { WalletLinkRelay } from "./relay/WalletLinkRelay"
import { WalletLinkRelayEventManager } from "./relay/WalletLinkRelayEventManager"
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
  /** @optional an implementation of WalletLinkUI; for most, leave it unspecified */
  walletLinkUIConstructor?: (
    options: Readonly<WalletLinkUIOptions>
  ) => WalletLinkUI
  /** @optional whether wallet link provider should override the isMetaMask property. */
  overrideIsMetaMask?: boolean
}

export class WalletLink {
  /**
   * WalletLink version
   */
  public static VERSION = WALLETLINK_VERSION

  private _appName = ""
  private _appLogoUrl: string | null = null
  private _relay: WalletLinkRelay | null = null
  private _relayEventManager: WalletLinkRelayEventManager | null = null
  private _storage: ScopedLocalStorage
  private _overrideIsMetaMask: boolean

  /**
   * Constructor
   * @param options WalletLink options object
   */
  constructor(options: Readonly<WalletLinkOptions>) {
    let walletLinkUrl = options.walletLinkUrl || WALLETLINK_URL
    let walletLinkUIConstructor: (
      options: Readonly<WalletLinkUIOptions>
    ) => WalletLinkUI
    if (!options.walletLinkUIConstructor) {
      walletLinkUIConstructor = options => new WalletLinkSdkUI(options)
    } else {
      walletLinkUIConstructor = options.walletLinkUIConstructor
    }

    if (typeof options.overrideIsMetaMask === "undefined") {
      this._overrideIsMetaMask = false
    } else {
      this._overrideIsMetaMask = options.overrideIsMetaMask
    }

    const u = url.parse(walletLinkUrl)
    const walletLinkOrigin = `${u.protocol}//${u.host}`
    this._storage = new ScopedLocalStorage(`-walletlink:${walletLinkOrigin}`)

    this._storage.setItem("version", WalletLink.VERSION)

    if (typeof window.walletLinkExtension !== "undefined") {
      return
    }

    this._relayEventManager = new WalletLinkRelayEventManager()

    this._relay = new WalletLinkRelay({
      walletLinkUrl: walletLinkUrl,
      version: WALLETLINK_VERSION,
      darkMode: !!options.darkMode,
      walletLinkUIConstructor: walletLinkUIConstructor,
      storage: this._storage,
      relayEventManager: this._relayEventManager
    })
    this.setAppInfo(options.appName, options.appLogoUrl)
    this._relay.attachUI()
  }

  /**
   * Create a Web3 Provider object
   * @param jsonRpcUrl Ethereum JSON RPC URL (Default: "")
   * @param chainId Ethereum Chain ID (Default: 1)
   * @returns A Web3 Provider
   */
  public makeWeb3Provider(
    jsonRpcUrl: string = "",
    chainId: number = 1
  ): WalletLinkProvider {
    if (typeof window.walletLinkExtension !== "undefined") {
      if (
        //@ts-ignore
        typeof window.walletLinkExtension.isCipher !== "boolean" ||
        //@ts-ignore
        !window.walletLinkExtension.isCipher
      ) {
        //@ts-ignore
        window.walletLinkExtension.setProviderInfo(jsonRpcUrl, chainId)
      }

      return window.walletLinkExtension
    }

    const relay = this._relay
    if (!relay || !this._relayEventManager || !this._storage) {
      throw new Error("Relay not initialized, should never happen")
    }

    if (!jsonRpcUrl) relay.setConnectDisabled(true)

    return new WalletLinkProvider({
      relayProvider: () => Promise.resolve(relay),
      relayEventManager: this._relayEventManager,
      storage: this._storage,
      jsonRpcUrl,
      chainId,
      overrideIsMetaMask: this._overrideIsMetaMask
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

    if (typeof window.walletLinkExtension !== "undefined") {
      if (
        //@ts-ignore
        typeof window.walletLinkExtension.isCipher !== "boolean" ||
        //@ts-ignore
        !window.walletLinkExtension.isCipher
      ) {
        //@ts-ignore
        window.walletLinkExtension.setAppInfo(this._appName, this._appLogoUrl)
      }
    } else {
      this._relay?.setAppInfo(this._appName, this._appLogoUrl)
    }
  }

  /**
   * Disconnect. After disconnecting, this will reload the web page to ensure
   * all potential stale state is cleared.
   */
  public disconnect(): void {
    if (typeof window.walletLinkExtension !== "undefined") {
      window.walletLinkExtension.close()
    } else {
      this._relay?.resetAndReload()
    }
  }
}

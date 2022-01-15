// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { WalletLinkAnalytics } from "./connection/WalletLinkAnalytics"
import { WalletLinkAnalyticsAbstract } from "./init/WalletLinkAnalyticsAbstract"
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
  /** @optional an implementation of WalletLinkAnalytics.ts; for most, leave it unspecified  */
  walletLinkAnalytics?: WalletLinkAnalyticsAbstract
  /** @optional whether wallet link provider should override the isMetaMask property. */
  overrideIsMetaMask?: boolean
  /** @optional whether wallet link provider should override the isCoinbaseWallet property. */
  overrideIsCoinbaseWallet?: boolean
}

export class WalletLink {
  /**
   * WalletLink version
   */
  public static VERSION = WALLETLINK_VERSION

  private _appName = ""
  private _appLogoUrl: string | null = null
  private _jsonRpcUrl: string | null = null
  private _relayProvider: (() => Promise<WalletLinkRelay>) | null = null
  private _walletLinkProvider: WalletLinkProvider | null = null
  private _relayEventManager: WalletLinkRelayEventManager | null = null
  private _storage: ScopedLocalStorage
  private _overrideIsMetaMask: boolean
  private _overrideIsCoinbaseWallet: boolean
  private _walletLinkAnalytics: WalletLinkAnalyticsAbstract

  /**
   * Constructor
   * @param options WalletLink options object
   */
  constructor(options: Readonly<WalletLinkOptions>) {
    const walletLinkUrl = options.walletLinkUrl || WALLETLINK_URL
    let walletLinkUIConstructor: (
      options: Readonly<WalletLinkUIOptions>
    ) => WalletLinkUI
    if (!options.walletLinkUIConstructor) {
      walletLinkUIConstructor = opts => new WalletLinkSdkUI(opts)
    } else {
      walletLinkUIConstructor = options.walletLinkUIConstructor
    }

    if (typeof options.overrideIsMetaMask === "undefined") {
      this._overrideIsMetaMask = false
    } else {
      this._overrideIsMetaMask = options.overrideIsMetaMask
    }

    this._overrideIsCoinbaseWallet = options.overrideIsCoinbaseWallet ?? true

    this._walletLinkAnalytics = options.walletLinkAnalytics
      ? options.walletLinkAnalytics
      : new WalletLinkAnalytics()

    const u = new URL(walletLinkUrl)
    const walletLinkOrigin = `${u.protocol}//${u.host}`
    this._storage = new ScopedLocalStorage(`-walletlink:${walletLinkOrigin}`)

    this._storage.setItem("version", WalletLink.VERSION)

    if (typeof window.walletLinkExtension !== "undefined") {
      return
    }

    this.setAppInfo(options.appName, options.appLogoUrl)

    const relayEventManager = new WalletLinkRelayEventManager()
    this._relayEventManager = relayEventManager

    this._relayProvider = () => {
      const relay = new WalletLinkRelay({
        walletLinkUrl,
        version: WALLETLINK_VERSION,
        darkMode: !!options.darkMode,
        walletLinkUIConstructor,
        storage: this._storage,
        relayEventManager,
        walletLinkAnalytics: this._walletLinkAnalytics
      })

      relay.setAppInfo(this._appName, this._appLogoUrl)

      if (!this._jsonRpcUrl) relay.setConnectDisabled(true)

      relay.attachUI()
      return Promise.resolve(relay)
    }
  }

  /**
   * Create a Web3 Provider object
   * @param jsonRpcUrl Ethereum JSON RPC URL (Default: "")
   * @param chainId Ethereum Chain ID (Default: 1)
   * @returns A Web3 Provider
   */
  public makeWeb3Provider(jsonRpcUrl = "", chainId = 1): WalletLinkProvider {
    if (typeof window.walletLinkExtension !== "undefined") {
      if (
        /* eslint-disable @typescript-eslint/ban-ts-comment */
        // @ts-ignore
        typeof window.walletLinkExtension.isCipher !== "boolean" ||
        // @ts-ignore
        !window.walletLinkExtension.isCipher
        /* eslint-enable @typescript-eslint/ban-ts-comment */
      ) {
        window.walletLinkExtension.setProviderInfo(jsonRpcUrl, chainId)
      }

      return window.walletLinkExtension
    }

    const relayProvider = this._relayProvider
    if (!relayProvider || !this._relayEventManager || !this._storage) {
      throw new Error("Relay not initialized, should never happen")
    }

    this._jsonRpcUrl = jsonRpcUrl

    const walletLinkProvider = new WalletLinkProvider({
      relayProvider: relayProvider,
      relayEventManager: this._relayEventManager,
      storage: this._storage,
      jsonRpcUrl,
      chainId,
      walletLinkAnalytics: this._walletLinkAnalytics,
      overrideIsMetaMask: this._overrideIsMetaMask,
      overrideIsCoinbaseWallet: this._overrideIsCoinbaseWallet
    })
    this._walletLinkProvider = walletLinkProvider
    return walletLinkProvider
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
        /* eslint-disable @typescript-eslint/ban-ts-comment */
        // @ts-ignore
        typeof window.walletLinkExtension.isCipher !== "boolean" ||
        // @ts-ignore
        !window.walletLinkExtension.isCipher
        /* eslint-enable @typescript-eslint/ban-ts-comment */
      ) {
        window.walletLinkExtension.setAppInfo(this._appName, this._appLogoUrl)
      }
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
      this._walletLinkProvider?.close()
    }
  }
}

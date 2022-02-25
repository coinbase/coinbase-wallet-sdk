// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { EventListener } from "./connection/EventListener"
import { ScopedLocalStorage } from "./lib/ScopedLocalStorage"
import { CBWalletProvider } from "./provider/CBWalletProvider"
import { CBWalletSDKUI } from "./provider/CBWalletSDKUI"
import { CBWalletUI, CBWalletUIOptions } from "./provider/CBWalletUI"
import { CBWalletRelay } from "./relay/CBWalletRelay"
import { CBWalletRelayEventManager } from "./relay/CBWalletRelayEventManager"
import { getFavicon } from "./util"

const API_URL =
    process.env.API_URL! || "https://www.walletlink.org"
const CBWSDK_VERSION =
    process.env.CBWSDK_VERSION! ||
    require("../package.json").version ||
    "unknown"

/** Coinbase Wallet SDK Constructor Options */
export interface CBWalletSDKOptions {
  /** Application name */
  appName: string
  /** @optional Application logo image URL; favicon is used if unspecified */
  appLogoUrl?: string | null
  /** @optional Use dark theme */
  darkMode?: boolean
  /** @optional Coinbase Wallet connection server URL; for most, leave it unspecified */
  apiUrl?: string
  /** @optional an implementation of CBWalletUI; for most, leave it unspecified */
  uiConstructor?: (
      options: Readonly<CBWalletUIOptions>
  ) => CBWalletUI
  /** @optional an implementation of EventListener for debugging; for most, leave it unspecified  */
  eventListener?: EventListener
  /** @optional whether wallet link provider should override the isMetaMask property. */
  overrideIsMetaMask?: boolean
  /** @optional whether wallet link provider should override the isCoinbaseWallet property. */
  overrideIsCoinbaseWallet?: boolean
}

export class CoinbaseWallet {
  public static VERSION = CBWSDK_VERSION

  private _appName = ""
  private _appLogoUrl: string | null = null
  private _relay: CBWalletRelay | null = null
  private _relayEventManager: CBWalletRelayEventManager | null = null
  private _storage: ScopedLocalStorage
  private _overrideIsMetaMask: boolean
  private _overrideIsCoinbaseWallet: boolean
  private _eventListener?: EventListener

  /**
   * Constructor
   * @param options Coinbase Wallet SDK constructor options
   */
  constructor(options: Readonly<CBWalletSDKOptions>) {
    const apiUrl = options.apiUrl || API_URL
    let uiConstructor: (
        options: Readonly<CBWalletUIOptions>
    ) => CBWalletUI
    if (!options.uiConstructor) {
      uiConstructor = opts => new CBWalletSDKUI(opts)
    } else {
      uiConstructor = options.uiConstructor
    }

    if (typeof options.overrideIsMetaMask === "undefined") {
      this._overrideIsMetaMask = false
    } else {
      this._overrideIsMetaMask = options.overrideIsMetaMask
    }

    this._overrideIsCoinbaseWallet = options.overrideIsCoinbaseWallet ?? true

    this._eventListener = options.eventListener

    const u = new URL(apiUrl)
    const origin = `${u.protocol}//${u.host}`
    this._storage = new ScopedLocalStorage(`-walletlink:${origin}`)

    this._storage.setItem("version", CoinbaseWallet.VERSION)

    if (typeof window.walletLinkExtension !== "undefined") {
      return
    }

    this._relayEventManager = new CBWalletRelayEventManager()

    this._relay = new CBWalletRelay({
      apiUrl,
      version: CBWSDK_VERSION,
      darkMode: !!options.darkMode,
      uiConstructor,
      storage: this._storage,
      relayEventManager: this._relayEventManager,
      eventListener: this._eventListener
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
    jsonRpcUrl = "",
    chainId = 1
  ): CBWalletProvider {
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

    const relay = this._relay
    if (!relay || !this._relayEventManager || !this._storage) {
      throw new Error("Relay not initialized, should never happen")
    }

    if (!jsonRpcUrl) relay.setConnectDisabled(true)

    return new CBWalletProvider({
      relayProvider: () => Promise.resolve(relay),
      relayEventManager: this._relayEventManager,
      storage: this._storage,
      jsonRpcUrl,
      chainId,
      eventListener: this._eventListener,
      overrideIsMetaMask: this._overrideIsMetaMask,
      overrideIsCoinbaseWallet: this._overrideIsCoinbaseWallet
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
        /* eslint-disable @typescript-eslint/ban-ts-comment */
        // @ts-ignore
        typeof window.walletLinkExtension.isCipher !== "boolean" ||
        // @ts-ignore
        !window.walletLinkExtension.isCipher
        /* eslint-enable @typescript-eslint/ban-ts-comment */
      ) {
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

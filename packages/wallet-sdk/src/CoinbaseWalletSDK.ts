// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { LogoType, walletLogo } from './assets/wallet-logo';
import { LINK_API_URL } from './core/constants';
import { getFavicon, isMobileWeb } from './core/util';
import { ScopedLocalStorage } from './lib/ScopedLocalStorage';
import { CoinbaseWalletProvider } from './provider/CoinbaseWalletProvider';
import { DiagnosticLogger } from './provider/DiagnosticLogger';
import { MobileRelay } from './relay/mobile/MobileRelay';
import { MobileRelayUI } from './relay/mobile/MobileRelayUI';
import { RelayEventManager } from './relay/RelayEventManager';
import { RelayUI, RelayUIOptions } from './relay/RelayUI';
import { WalletLinkRelayUI } from './relay/walletlink/ui/WalletLinkRelayUI';
import { WalletLinkRelay } from './relay/walletlink/WalletLinkRelay';
import { LIB_VERSION } from './version';

/** Coinbase Wallet SDK Constructor Options */
export interface CoinbaseWalletSDKOptions {
  /** Application name */
  appName: string;
  /** @optional Application logo image URL; favicon is used if unspecified */
  appLogoUrl?: string | null;
  /** @optional Use dark theme */
  darkMode?: boolean;
  /** @optional Coinbase Wallet link server URL; for most, leave it unspecified */
  linkAPIUrl?: string;
  /** @optional an implementation of WalletUI; for most, leave it unspecified */
  uiConstructor?: (options: Readonly<RelayUIOptions>) => RelayUI;
  /** @optional a diagnostic tool for debugging; for most, leave it unspecified  */
  diagnosticLogger?: DiagnosticLogger;
  /** @optional whether wallet link provider should override the isMetaMask property. */
  overrideIsMetaMask?: boolean;
  /** @optional whether wallet link provider should override the isCoinbaseWallet property. */
  overrideIsCoinbaseWallet?: boolean;
  /** @optional whether coinbase wallet provider should override the isCoinbaseBrowser property. */
  overrideIsCoinbaseBrowser?: boolean;
  /** @optional whether or not onboarding overlay popup should be displayed */
  headlessMode?: boolean;
  /** @optional whether or not to reload dapp automatically after disconnect, defaults to true */
  reloadOnDisconnect?: boolean;
  /** @optional whether to connect mobile web app via WalletLink, defaults to false */
  enableMobileWalletLink?: boolean;
}

export class CoinbaseWalletSDK {
  public static VERSION = LIB_VERSION;

  private _appName = '';
  private _appLogoUrl: string | null = null;
  private _relay: WalletLinkRelay | null = null;
  private _relayEventManager: RelayEventManager | null = null;
  private _storage: ScopedLocalStorage;
  private _overrideIsMetaMask: boolean;
  private _overrideIsCoinbaseWallet: boolean;
  private _overrideIsCoinbaseBrowser: boolean;
  private _diagnosticLogger?: DiagnosticLogger;
  private _reloadOnDisconnect?: boolean;

  /**
   * Constructor
   * @param options Coinbase Wallet SDK constructor options
   */
  constructor(options: Readonly<CoinbaseWalletSDKOptions>) {
    const linkAPIUrl = options.linkAPIUrl || LINK_API_URL;
    if (typeof options.overrideIsMetaMask === 'undefined') {
      this._overrideIsMetaMask = false;
    } else {
      this._overrideIsMetaMask = options.overrideIsMetaMask;
    }

    this._overrideIsCoinbaseWallet = options.overrideIsCoinbaseWallet ?? true;
    this._overrideIsCoinbaseBrowser = options.overrideIsCoinbaseBrowser ?? false;

    this._diagnosticLogger = options.diagnosticLogger;

    this._reloadOnDisconnect = options.reloadOnDisconnect ?? true;

    const url = new URL(linkAPIUrl);
    const origin = `${url.protocol}//${url.host}`;
    this._storage = new ScopedLocalStorage(`-walletlink:${origin}`); // needs migration to preserve local states
    this._storage.setItem('version', CoinbaseWalletSDK.VERSION);

    if (this.walletExtension || this.coinbaseBrowser) {
      return;
    }

    this._relayEventManager = new RelayEventManager();

    const isMobile = isMobileWeb();
    const uiConstructor =
      options.uiConstructor ||
      ((opts) => (isMobile ? new MobileRelayUI(opts) : new WalletLinkRelayUI(opts)));

    const relayOption = {
      linkAPIUrl,
      version: LIB_VERSION,
      darkMode: !!options.darkMode,
      headlessMode: !!options.headlessMode,
      uiConstructor,
      storage: this._storage,
      relayEventManager: this._relayEventManager,
      diagnosticLogger: this._diagnosticLogger,
      reloadOnDisconnect: this._reloadOnDisconnect,
      enableMobileWalletLink: options.enableMobileWalletLink,
    };

    this._relay = isMobile ? new MobileRelay(relayOption) : new WalletLinkRelay(relayOption);

    this.setAppInfo(options.appName, options.appLogoUrl);

    if (options.headlessMode) return;

    this._relay.attachUI();
  }

  /**
   * Create a Web3 Provider object
   * @param jsonRpcUrl Ethereum JSON RPC URL (Default: "")
   * @param chainId Ethereum Chain ID (Default: 1)
   * @returns A Web3 Provider
   */
  public makeWeb3Provider(jsonRpcUrl = '', chainId = 1): CoinbaseWalletProvider {
    const extension = this.walletExtension;
    if (extension) {
      if (!this.isCipherProvider(extension)) {
        extension.setProviderInfo(jsonRpcUrl, chainId);
      }

      if (
        this._reloadOnDisconnect === false &&
        typeof extension.disableReloadOnDisconnect === 'function'
      )
        extension.disableReloadOnDisconnect();

      return extension;
    }

    const dappBrowser = this.coinbaseBrowser;
    if (dappBrowser) {
      return dappBrowser;
    }

    const relay = this._relay;
    if (!relay || !this._relayEventManager || !this._storage) {
      throw new Error('Relay not initialized, should never happen');
    }

    if (!jsonRpcUrl) relay.setConnectDisabled(true);

    return new CoinbaseWalletProvider({
      relayProvider: () => Promise.resolve(relay),
      relayEventManager: this._relayEventManager,
      storage: this._storage,
      jsonRpcUrl,
      chainId,
      qrUrl: this.getQrUrl(),
      diagnosticLogger: this._diagnosticLogger,
      overrideIsMetaMask: this._overrideIsMetaMask,
      overrideIsCoinbaseWallet: this._overrideIsCoinbaseWallet,
      overrideIsCoinbaseBrowser: this._overrideIsCoinbaseBrowser,
    });
  }

  /**
   * Set application information
   * @param appName Application name
   * @param appLogoUrl Application logo image URL
   */
  public setAppInfo(appName: string | undefined, appLogoUrl: string | null | undefined): void {
    this._appName = appName || 'DApp';
    this._appLogoUrl = appLogoUrl || getFavicon();

    const extension = this.walletExtension;
    if (extension) {
      if (!this.isCipherProvider(extension)) {
        extension.setAppInfo(this._appName, this._appLogoUrl);
      }
    } else {
      this._relay?.setAppInfo(this._appName, this._appLogoUrl);
    }
  }

  /**
   * Disconnect. After disconnecting, this will reload the web page to ensure
   * all potential stale state is cleared.
   */
  public disconnect(): void {
    const extension = this?.walletExtension;
    if (extension) {
      void extension.close();
    } else {
      this._relay?.resetAndReload();
    }
  }

  /**
   * Return QR URL for mobile wallet connection, will return null if extension is installed
   */
  public getQrUrl(): string | null {
    return this._relay?.getQRCodeUrl() ?? null;
  }

  /**
   * Official Coinbase Wallet logo for developers to use on their frontend
   * @param type Type of wallet logo: "standard" | "circle" | "text" | "textWithLogo" | "textLight" | "textWithLogoLight"
   * @param width Width of the logo (Optional)
   * @returns SVG Data URI
   */
  public getCoinbaseWalletLogo(type: LogoType, width = 240): string {
    return walletLogo(type, width);
  }

  private get walletExtension(): CoinbaseWalletProvider | undefined {
    return window.coinbaseWalletExtension ?? window.walletLinkExtension;
  }

  private get coinbaseBrowser(): CoinbaseWalletProvider | undefined {
    try {
      // Coinbase DApp browser does not inject into iframes so grab provider from top frame if it exists
      const ethereum = (window as any).ethereum ?? (window as any).top?.ethereum;
      if (!ethereum) {
        return undefined;
      }

      if ('isCoinbaseBrowser' in ethereum && ethereum.isCoinbaseBrowser) {
        return ethereum;
      }
      return undefined;
    } catch (e) {
      return undefined;
    }
  }

  private isCipherProvider(provider: CoinbaseWalletProvider): boolean {
    // @ts-expect-error isCipher walletlink property
    return typeof provider.isCipher === 'boolean' && provider.isCipher;
  }
}

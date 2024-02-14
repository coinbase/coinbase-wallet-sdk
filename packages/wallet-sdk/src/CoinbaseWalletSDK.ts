// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { LogoType, walletLogo } from './assets/wallet-logo';
import { LINK_API_URL } from './core/constants';
import { getFavicon } from './core/util';
import { ScopedLocalStorage } from './lib/ScopedLocalStorage';
import { CoinbaseWalletProvider } from './provider/CoinbaseWalletProvider';
import { ProviderInterface } from './provider/ProviderInterface';
import { PopUpCommunicator } from './transport/PopUpCommunicator';
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
  /** @optional SCW FE URL */
  scwUrl?: string;
}

export class CoinbaseWalletSDK {
  public static VERSION = LIB_VERSION;

  private _appName = '';
  private _appLogoUrl: string | null = null;
  private _storage: ScopedLocalStorage;
  private linkAPIUrl: string;
  private popupCommunicator: PopUpCommunicator;

  /**
   * Constructor
   * @param options Coinbase Wallet SDK constructor options
   */
  constructor(options: Readonly<CoinbaseWalletSDKOptions>) {
    this.linkAPIUrl = options.linkAPIUrl || LINK_API_URL;

    const url = new URL(this.linkAPIUrl);
    const origin = `${url.protocol}//${url.host}`;
    this._storage = new ScopedLocalStorage(`-walletlink:${origin}`); // needs migration to preserve local states
    this._storage.setItem('version', CoinbaseWalletSDK.VERSION);

    this.popupCommunicator = new PopUpCommunicator({
      url: options.scwUrl || 'https://scw-dev.cbhq.net/connect',
    });

    this.setAppInfo(options.appName, options.appLogoUrl);
  }

  /**
   * Create a Web3 Provider object
   * @param jsonRpcUrl Ethereum JSON RPC URL (Default: "")
   * @param chainId Ethereum Chain ID (Default: 1)
   * @returns A Web3 Provider
   */
  public makeWeb3Provider(jsonRpcUrl = '', chainId = 1): ProviderInterface {
    const extension = this.walletExtension;
    if (extension) {
      if (!this.isCipherProvider(extension)) {
        (extension as LegacyProviderInterface).setProviderInfo?.(jsonRpcUrl, chainId);
      }
      return extension;
    }

    const dappBrowser = this.coinbaseBrowser;
    if (dappBrowser) {
      return dappBrowser;
    }

    if (!this._storage) {
      throw new Error('Storage not initialized, should never happen');
    }

    return new CoinbaseWalletProvider({
      storage: this._storage,
      popupCommunicator: this.popupCommunicator,
      appName: this._appName,
      appLogoUrl: this._appLogoUrl,
    });
  }

  /**
   * Set application information
   * @param appName Application name
   * @param appLogoUrl Application logo image URL
   */
  private setAppInfo(appName: string | undefined, appLogoUrl: string | null | undefined): void {
    this._appName = appName || 'DApp';
    this._appLogoUrl = appLogoUrl || getFavicon();

    const extension = this.walletExtension;
    if (extension) {
      if (!this.isCipherProvider(extension)) {
        (extension as LegacyProviderInterface).setAppInfo?.(this._appName, this._appLogoUrl);
      }
    }
  }

  /**
   * Disconnect. After disconnecting, this will reload the web page to ensure
   * all potential stale state is cleared.
   */
  public disconnect(): void {
    const extension = this?.walletExtension;
    if (extension) {
      (extension as LegacyProviderInterface).close?.();
    } else {
      this._storage.clear();
    }
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

  private get walletExtension(): ProviderInterface | undefined {
    return window.coinbaseWalletExtension;
  }

  private get coinbaseBrowser(): ProviderInterface | undefined {
    try {
      // Coinbase DApp browser does not inject into iframes so grab provider from top frame if it exists
      const ethereum = window.ethereum ?? window.top?.ethereum;
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

  private isCipherProvider(provider: ProviderInterface): boolean {
    // @ts-expect-error isCipher walletlink property
    return typeof provider.isCipher === 'boolean' && provider.isCipher;
  }
}

interface LegacyProviderInterface extends ProviderInterface {
  setAppInfo?(appName: string, appLogoUrl: string | null): void;
  setProviderInfo?(jsonRpcUrl: string, chainId: number): void;
  close?(): void;
}

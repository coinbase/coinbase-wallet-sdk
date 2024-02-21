// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { LogoType, walletLogo } from './assets/wallet-logo';
import { LINK_API_URL } from './core/constants';
import { getFavicon } from './core/util';
import { ScopedLocalStorage } from './lib/ScopedLocalStorage';
import { CoinbaseWalletProvider } from './provider/NewProvider';
import { ProviderInterface } from './provider/ProviderInterface';
import { LIB_VERSION } from './version';

export const ConnectionPreferences = ['default', 'external', 'embedded'] as const;
export type ConnectionPreference = (typeof ConnectionPreferences)[number];

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
  // TODO: to remove scwUrl before release
  /** @optional SCW FE URL */
  scwUrl?: string;
  /** @optional Array of chainIds your dapp supports */
  chainIds?: string[];
  /** @optional Pre-select the wallet connection method */
  connectionPreference?: ConnectionPreference;
}

export class CoinbaseWalletSDK {
  public static VERSION = LIB_VERSION;

  private _appName = '';
  private _appLogoUrl: string | null = null;
  private _storage: ScopedLocalStorage;
  private _connectionPreference: ConnectionPreference;
  private _chainIds: number[];
  private linkAPIUrl: string;
  private scwUrl?: string;

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
    this._connectionPreference = options.connectionPreference || 'default';
    this._chainIds = options.chainIds ? options.chainIds.map(Number) : [];

    // TODO: revisit arg name. update default url to production.
    this.scwUrl = options.scwUrl || 'https://scw-dev.cbhq.net/connect';

    this._appName = options.appName || 'DApp';
    this._appLogoUrl = options.appLogoUrl || getFavicon();
  }

  public makeWeb3Provider(): ProviderInterface {
    const extension = this.walletExtension;
    if (extension) {
      extension.setAppInfo?.(this._appName, this._appLogoUrl);
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
      scwUrl: this.scwUrl,
      appName: this._appName,
      appLogoUrl: this._appLogoUrl,
      appChainIds: this._chainIds,
      connectionPreference: this._connectionPreference,
    });
  }

  public disconnect(): void {
    const extension = this?.walletExtension;
    if (extension) {
      extension.close?.();
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

  private get walletExtension(): LegacyProviderInterface | undefined {
    return window.coinbaseWalletExtension ?? window.walletLinkExtension;
  }

  private get coinbaseBrowser(): LegacyProviderInterface | undefined {
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
}

interface LegacyProviderInterface extends ProviderInterface {
  setAppInfo?(appName: string, appLogoUrl: string | null): void;
  close?(): void;
}

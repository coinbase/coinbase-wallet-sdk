// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

import { LogoType, walletLogo } from './assets/wallet-logo';
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { ScopedLocalStorage } from './core/storage/ScopedLocalStorage';
import { ConstructorOptions, ProviderInterface } from './core/type/ProviderInterface';
import { getFavicon } from './core/util';
import { LIB_VERSION } from './version';
import { fetchCoinbaseInjectedProvider } from ':core/providerUtils';

export class CoinbaseWalletSDK {
  private appName: string;
  private appLogoUrl: string | null;
  private smartWalletOnly: boolean;
  private chainIds: number[];

  /**
   * Constructor
   * @param options Coinbase Wallet SDK constructor options
   */
  constructor(options: Readonly<Partial<ConstructorOptions>>) {
    this.smartWalletOnly = options.smartWalletOnly || false;
    this.chainIds = options.appChainIds?.map(Number) ?? [];
    this.appName = options.appName || 'DApp';
    this.appLogoUrl = options.appLogoUrl || getFavicon();

    this.storeLatestVersion();
  }

  public makeWeb3Provider(): ProviderInterface {
    const provider = fetchCoinbaseInjectedProvider(this.smartWalletOnly);

    if (provider) {
      if ('setAppInfo' in provider && typeof provider.setAppInfo === 'function') {
        provider.setAppInfo(this.appName, this.appLogoUrl);
      }
      return provider;
    }

    return new CoinbaseWalletProvider({
      appName: this.appName,
      appLogoUrl: this.appLogoUrl,
      appChainIds: this.chainIds,
      smartWalletOnly: this.smartWalletOnly,
    });
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

  private storeLatestVersion() {
    const versionStorage = new ScopedLocalStorage('CBWSDK');
    versionStorage.setItem('VERSION', LIB_VERSION);
  }
}

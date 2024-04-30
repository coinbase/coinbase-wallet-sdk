// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

import { LogoType, walletLogo } from './assets/wallet-logo';
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { AppMetadata, Preference, ProviderInterface } from './core/provider/interface';
import { ScopedLocalStorage } from './util/ScopedLocalStorage';
import { LIB_VERSION } from './version';
import { getCoinbaseInjectedProvider } from ':core/provider/util';
import { getFavicon } from ':core/util';

// for backwards compatibility
type CoinbaseWalletSDKOptions = Partial<AppMetadata>;

export class CoinbaseWalletSDK {
  private metadata: CoinbaseWalletSDKOptions;

  constructor(metadata: Readonly<CoinbaseWalletSDKOptions>) {
    this.metadata = metadata;
    this.storeLatestVersion();
  }

  public makeWeb3Provider(preference: Preference = { options: 'all' }): ProviderInterface {
    const { appName = 'Dapp', appLogoUrl = getFavicon(), appChainIds = [] } = this.metadata;

    const provider = getCoinbaseInjectedProvider(preference);
    if (provider) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).setAppInfo?.(appName, appLogoUrl, appChainIds);
      return provider;
    }

    return new CoinbaseWalletProvider({
      metadata: {
        appName,
        appLogoUrl,
        appChainIds,
      },
      preference,
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

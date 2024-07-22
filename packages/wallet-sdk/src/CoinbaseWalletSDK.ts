// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

import { LogoType, walletLogo } from './assets/wallet-logo';
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { AppMetadata, Preference, ProviderInterface } from './core/type/provider';
import { ScopedStorage } from './util/ScopedStorage';
import { LIB_VERSION } from './version';
import { getFavicon } from ':core/type/util';
import type { BaseStorage } from ':util/BaseStorage';

// for backwards compatibility
type CoinbaseWalletSDKOptions = Partial<
  AppMetadata & {
    storage: BaseStorage;
  }
>;

interface CBWindow {
  top: CBWindow;
  ethereum?: { isCoinbaseBrowser?: boolean };
}

export class CoinbaseWalletSDK {
  private metadata: AppMetadata;
  private baseStorage?: BaseStorage;

  constructor(options: Readonly<CoinbaseWalletSDKOptions>) {
    this.metadata = {
      appName: options.appName || 'Dapp',
      appLogoUrl: options.appLogoUrl || getFavicon(),
      appChainIds: options.appChainIds || [],
    };
    this.baseStorage = options.storage;
    this.storeLatestVersion(options.storage);
  }

  public makeWeb3Provider(preference: Preference = { options: 'all' }): ProviderInterface {
    try {
      const window = globalThis as CBWindow;
      const ethereum = window.ethereum ?? window.top?.ethereum;
      if (ethereum?.isCoinbaseBrowser) {
        return ethereum as ProviderInterface;
      }
    } catch {
      // Ignore
    }
    return new CoinbaseWalletProvider({
      baseStorage: this.baseStorage,
      metadata: this.metadata,
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

  private storeLatestVersion(storage: BaseStorage | undefined) {
    const versionStorage = new ScopedStorage('CBWSDK', undefined, storage);
    versionStorage.setItem('VERSION', LIB_VERSION);
  }
}

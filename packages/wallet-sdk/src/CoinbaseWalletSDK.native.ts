// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

import { LogoType, walletLogo } from './assets/wallet-logo';
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { AppMetadata, ProviderInterface } from './core/provider/interface';
import { LIB_VERSION } from './version';
import { MOBILE_SDK_RESPONSE_PATH } from ':core/constants';
import { ScopedAsyncStorage } from ':core/storage/ScopedAsyncStorage';

type CoinbaseWalletSDKOptions = Partial<AppMetadata>;

export class CoinbaseWalletSDK {
  private metadata: AppMetadata;

  constructor(metadata: Readonly<CoinbaseWalletSDKOptions>) {
    if (!metadata.appDeeplinkUrl) {
      throw new Error('appDeeplinkUrl is required on Mobile');
    }

    const url = new URL(metadata.appDeeplinkUrl);
    url.pathname += url.pathname.endsWith('/')
      ? MOBILE_SDK_RESPONSE_PATH
      : `/${MOBILE_SDK_RESPONSE_PATH}`;

    this.metadata = {
      appName: metadata.appName || 'Dapp',
      appLogoUrl: metadata.appLogoUrl || null,
      appChainIds: metadata.appChainIds || [],
      appDeeplinkUrl: url.toString(),
    };
    this.storeLatestVersion();
  }

  public makeWeb3Provider(): ProviderInterface {
    return new CoinbaseWalletProvider({
      metadata: this.metadata,
      preference: { options: 'smartWalletOnly' },
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

  private async storeLatestVersion() {
    const versionStorage = new ScopedAsyncStorage('CBWSDK');
    versionStorage.setItem('VERSION', LIB_VERSION);
  }
}

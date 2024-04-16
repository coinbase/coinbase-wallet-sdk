// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

import { LogoType, walletLogo } from './assets/wallet-logo';
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { ScopedLocalStorage } from './core/storage/ScopedLocalStorage';
import { ConstructorOptions, ProviderInterface } from './core/type/ProviderInterface';
import { getFavicon } from './core/util';
import { Signer } from './sign/SignerInterface';
import { LIB_VERSION } from './version';

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

  private storeLatestVersion() {
    const versionStorage = new ScopedLocalStorage('CBWSDK');
    versionStorage.setItem('VERSION', LIB_VERSION);
  }

  public makeWeb3Provider(): ProviderInterface {
    if (!this.smartWalletOnly) {
      const extensionProvider = this.walletExtension;
      const shouldUseExtensionProvider = extensionProvider && !this.walletExtensionSigner;

      if (shouldUseExtensionProvider) {
        if (
          'setAppInfo' in extensionProvider &&
          typeof extensionProvider.setAppInfo === 'function'
        ) {
          extensionProvider.setAppInfo?.(this.appName, this.appLogoUrl);
        }
        return extensionProvider;
      }
    }

    const dappBrowser = this.coinbaseBrowser;
    if (dappBrowser) {
      return dappBrowser;
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

  private get walletExtension(): ProviderInterface | undefined {
    return window.coinbaseWalletExtension;
  }

  private get walletExtensionSigner(): Signer | undefined {
    return window.coinbaseWalletExtensionSigner;
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
}

import { Mock } from 'vitest';

import { CoinbaseWalletProvider } from './CoinbaseWalletProvider.js';
import { CoinbaseWalletSDK } from './CoinbaseWalletSDK.js';
import { ProviderInterface } from ':core/provider/interface.js';
import { getFavicon } from ':core/type/util.js';
import { getCoinbaseInjectedProvider } from ':util/provider.js';

vi.mock(':core/type/util');
vi.mock(':util/provider');
vi.mock('./CoinbaseWalletProvider');
vi.mock('./util/checkCrossOriginOpenerPolicy');

describe('CoinbaseWalletSDK', () => {
  test('@makeWeb3Provider - return Coinbase Injected Provider', () => {
    const injectedProvider = {} as unknown as ProviderInterface;
    (getCoinbaseInjectedProvider as Mock).mockReturnValue(injectedProvider);

    const SDK = new CoinbaseWalletSDK({
      appName: 'Test',
      appLogoUrl: 'http://coinbase.com/wallet-logo.png',
    });

    expect(SDK.makeWeb3Provider()).toBe(injectedProvider);
  });

  test('@makeWeb3Provider - return new CoinbaseWalletProvider', () => {
    (getCoinbaseInjectedProvider as Mock).mockReturnValue(undefined);

    const SDK = new CoinbaseWalletSDK({
      appName: 'Test',
      appLogoUrl: 'http://coinbase.com/wallet-logo.png',
    });

    SDK.makeWeb3Provider();

    expect(CoinbaseWalletProvider).toHaveBeenCalledWith({
      metadata: {
        appName: 'Test',
        appLogoUrl: 'http://coinbase.com/wallet-logo.png',
        appChainIds: [],
      },
      preference: {
        options: 'all',
      },
    });
  });

  test('@makeWeb3Provider - default values for metadata', () => {
    (getFavicon as Mock).mockReturnValue('https://dapp.xyz/pic.png');
    (getCoinbaseInjectedProvider as Mock).mockReturnValue(undefined);

    const SDK = new CoinbaseWalletSDK({
      appName: '',
      appLogoUrl: '',
    });

    SDK.makeWeb3Provider();

    expect(CoinbaseWalletProvider).toHaveBeenCalledWith({
      metadata: {
        appName: 'Dapp',
        appLogoUrl: 'https://dapp.xyz/pic.png',
        appChainIds: [],
      },
      preference: {
        options: 'all',
      },
    });
  });
});

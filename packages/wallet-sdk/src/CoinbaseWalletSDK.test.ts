import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { CoinbaseWalletSDK } from './CoinbaseWalletSDK';
import { ProviderInterface } from ':core/provider/interface';
import { getFavicon } from ':core/type/util';
import { getCoinbaseInjectedProvider } from ':util/provider';

jest.mock(':core/type/util');
jest.mock(':util/provider');
jest.mock('./CoinbaseWalletProvider');

describe('CoinbaseWalletSDK', () => {
  test('@makeWeb3Provider - return Coinbase Injected Provider', () => {
    const injectedProvider = {} as unknown as ProviderInterface;
    (getCoinbaseInjectedProvider as jest.Mock).mockReturnValue(injectedProvider);

    const SDK = new CoinbaseWalletSDK({
      appName: 'Test',
      appLogoUrl: 'http://coinbase.com/wallet-logo.png',
    });

    expect(SDK.makeWeb3Provider()).toBe(injectedProvider);
  });

  test('@makeWeb3Provider - return new CoinbaseWalletProvider', () => {
    (getCoinbaseInjectedProvider as jest.Mock).mockReturnValue(undefined);

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
    (getFavicon as jest.Mock).mockReturnValue('https://dapp.xyz/pic.png');
    (getCoinbaseInjectedProvider as jest.Mock).mockReturnValue(undefined);

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

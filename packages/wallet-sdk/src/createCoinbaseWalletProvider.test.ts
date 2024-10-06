import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { createCoinbaseWalletProvider } from './createCoinbaseWalletProvider';
import { ConstructorOptions } from ':core/provider/interface';

describe('createCoinbaseWalletProvider', () => {
  it('should return a provider', () => {
    const options: ConstructorOptions = {
      metadata: {
        appName: 'Dapp',
        appLogoUrl: 'https://example.com/favicon.ico',
        appChainIds: [],
      },
      preference: { options: 'all' },
    };
    const result = createCoinbaseWalletProvider(options);
    expect(result).toBeInstanceOf(CoinbaseWalletProvider);
  });
});

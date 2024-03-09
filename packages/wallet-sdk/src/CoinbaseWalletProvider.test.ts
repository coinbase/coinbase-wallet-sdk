import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { standardErrors } from './core/error';

describe('EIP1193Provider', () => {
  let provider: CoinbaseWalletProvider;

  beforeEach(() => {
    provider = new CoinbaseWalletProvider({
      scwUrl: 'http://fooUrl.com',
      appName: 'TestApp',
      appChainIds: [],
      connectionPreference: 'default',
    });
  });

  it('emits disconnect event on user initiated disconnection', async () => {
    const disconnectListener = jest.fn();
    provider.on('disconnect', disconnectListener);

    await provider.disconnect();

    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  });

  describe('default chain id', () => {
    it('uses the first chain id when appChainIds is not empty', () => {
      const provider = new CoinbaseWalletProvider({
        scwUrl: 'http://fooUrl.com',
        appName: 'TestApp',
        appChainIds: [8453, 84532],
        connectionPreference: 'default',
      });
      expect(provider.chainId).toBe(8453);
    });

    it('fallback to 1 when appChainIds is empty', () => {
      const provider = new CoinbaseWalletProvider({
        scwUrl: 'http://fooUrl.com',
        appName: 'TestApp',
        appChainIds: [],
        connectionPreference: 'default',
      });
      expect(provider.chainId).toBe(1);
    });
  });
});

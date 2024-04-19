import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { standardErrors } from './core/error';

describe('CoinbaseWalletProvider', () => {
  let provider: CoinbaseWalletProvider;

  beforeEach(() => {
    provider = new CoinbaseWalletProvider({
      metadata: {
        appName: 'TestApp',
        appLogoUrl: null,
        appChainIds: [],
      },
      preference: {
        options: 'all',
      },
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

  describe('Request Handling', () => {
    test('handles request correctly', async () => {
      const response1 = await provider.request({ method: 'eth_chainId' });
      const response2 = await provider.request({ method: 'eth_accounts' });
      expect(response1).toBe(1);
      expect(response2).toEqual([]);
    });

    test('throws error when handling invalid request', async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error // testing invalid request args
      await expect(provider.request({})).rejects.toThrow();
    });
  });
});

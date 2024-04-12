import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { standardErrors } from './core/error';

describe('CoinbaseWalletProvider', () => {
  let provider: CoinbaseWalletProvider;

  beforeEach(() => {
    provider = new CoinbaseWalletProvider({
      appName: 'TestApp',
      appChainIds: [],
      smartWalletOnly: false,
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
        appName: 'TestApp',
        appChainIds: [8453, 84532],
        smartWalletOnly: false,
      });
      expect(provider.chainId).toBe(8453);
    });

    it('fallback to 1 when appChainIds is empty', () => {
      const provider = new CoinbaseWalletProvider({
        appName: 'TestApp',
        appChainIds: [],
        smartWalletOnly: false,
      });
      expect(provider.chainId).toBe(1);
    });
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

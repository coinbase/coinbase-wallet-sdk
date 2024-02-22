import { standardErrors } from '../core/error';
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';

describe('EIP1193Provider', () => {
  let provider: CoinbaseWalletProvider;

  beforeEach(() => {
    provider = new CoinbaseWalletProvider({
      scwUrl: 'http://fooUrl.com',
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
});

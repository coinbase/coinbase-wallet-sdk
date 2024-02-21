import { standardErrors } from '../core/error';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { CoinbaseWalletProvider } from './NewProvider';

describe('EIP1193Provider', () => {
  let provider: CoinbaseWalletProvider;

  beforeEach(() => {
    provider = new CoinbaseWalletProvider({
      storage: new ScopedLocalStorage('-walletlink'),
      scwUrl: 'http://fooUrl.com',
      appChainIds: [],
      connectionPreference: 'default',
    });
  });

  it('emits disconnect event on user initiated disconnection', () => {
    const disconnectListener = jest.fn();
    provider.on('disconnect', disconnectListener);

    provider.disconnect();

    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  });
});

import { standardErrors } from '../core/error';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { PopUpCommunicator } from '../transport/PopUpCommunicator';
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';

describe('EIP1193Provider', () => {
  let provider: CoinbaseWalletProvider;

  beforeEach(() => {
    provider = new CoinbaseWalletProvider({
      storage: new ScopedLocalStorage('-walletlink'),
      popupCommunicator: new PopUpCommunicator({ url: 'http://fooUrl.com' }),
    });
  });

  it('initializes correctly', () => {
    expect(provider.connected).toBe(false);
  });

  it('emits disconnect event on user initiated disconnection', () => {
    const disconnectListener = jest.fn();
    provider.on('disconnect', disconnectListener);

    provider.disconnect();

    expect(disconnectListener).toHaveBeenCalledWith({
      error: standardErrors.provider.disconnected('User initiated disconnection'),
    });
  });
});

import { standardErrors } from '../core/error';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { PopUpCommunicator } from '../transport/PopUpCommunicator';
import { EIP1193Provider } from './EIP1193Provider';

describe('EIP1193Provider', () => {
  let provider: EIP1193Provider;

  beforeEach(() => {
    provider = new EIP1193Provider({
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

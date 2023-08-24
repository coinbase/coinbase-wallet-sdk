import { WalletLinkConnection } from '../connection/WalletLinkConnection';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { WalletLinkRelay } from './WalletLinkRelay';
import { WalletSDKRelayEventManager } from './WalletSDKRelayEventManager';

describe('WalletLinkRelay', () => {
  let relay: WalletLinkRelay;

  beforeEach(() => {
    relay = new WalletLinkRelay({
      linkAPIUrl: 'http://link-api-url',
      version: '0.0.0',
      darkMode: false,
      storage: new ScopedLocalStorage('test'),
      relayEventManager: new WalletSDKRelayEventManager(),
      uiConstructor: jest.fn(),
    });
  });

  describe('resetAndReload', () => {
    it('should destroy the connection and connect again', async () => {
      const setSessionMetadataSpy = jest.spyOn(
        WalletLinkConnection.prototype,
        'setSessionMetadata'
      );

      relay.resetAndReload();
      expect(setSessionMetadataSpy).toHaveBeenCalled();
    });
  });
});

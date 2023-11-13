import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { Session } from '../relay/Session';
import { APP_VERSION_KEY, WALLET_USER_NAME_KEY } from '../relay/WalletSDKRelayAbstract';
import { SessionConfig } from './SessionConfig';
import { WalletLinkConnection, WalletLinkConnectionUpdateListener } from './WalletLinkConnection';
import { WalletLinkConnectionCipher } from './WalletLinkConnectionCipher';

describe('WalletLinkConnection', () => {
  const session = new Session(new ScopedLocalStorage('test'));

  let connection: WalletLinkConnection;
  let cipher: WalletLinkConnectionCipher;
  let listener: WalletLinkConnectionUpdateListener;

  beforeEach(() => {
    jest.clearAllMocks();

    listener = {
      linkedUpdated: jest.fn(),
      connectedUpdated: jest.fn(),
      handleResponseMessage: jest.fn(),
      chainUpdated: jest.fn(),
      accountUpdated: jest.fn(),
      metadataUpdated: jest.fn(),
      resetAndReload: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    cipher = {
      encrypt: jest.fn().mockImplementation((text) => Promise.resolve(`encrypted ${text}`)),
      decrypt: jest.fn().mockImplementation((text) => Promise.resolve(`decrypted ${text}`)),
    };

    connection = new WalletLinkConnection(session, 'http://link-api-url', listener);
    (connection as any).cipher = cipher;
  });

  describe('incomingDataListener', () => {
    it('should call handleSessionConfigUpdated when session config is updated', async () => {
      const handleSessionConfigUpdatedSpy = jest.spyOn(
        connection as any,
        'handleSessionConfigUpdated'
      );

      const sessionConfig: SessionConfig = {
        webhookId: 'webhookId',
        webhookUrl: 'webhookUrl',
        metadata: {
          WalletUsername: 'new username',
        },
      };

      (connection as any).ws.incomingDataListener?.({
        ...sessionConfig,
        type: 'SessionConfigUpdated',
      });

      expect(handleSessionConfigUpdatedSpy).toHaveBeenCalledWith(sessionConfig.metadata);
    });
  });

  describe('handleSessionConfigUpdated', () => {
    let handleSessionConfigUpdated: (metadata: SessionConfig['metadata']) => void;

    beforeEach(() => {
      handleSessionConfigUpdated = (connection as any).handleSessionConfigUpdated;
    });

    it('should call listner.metadataUpdated when WalletUsername changed', async () => {
      const newUsername = 'new username';

      const listenerMetadataUpdatedSpy = jest.spyOn(listener, 'metadataUpdated');

      handleSessionConfigUpdated({ WalletUsername: newUsername });

      expect(cipher.decrypt).toHaveBeenCalledWith(newUsername);
      expect(listenerMetadataUpdatedSpy).toHaveBeenCalledWith(
        WALLET_USER_NAME_KEY,
        await cipher.decrypt(newUsername)
      );
    });

    it('should call listner.metadataUpdated when AppVersion changed', async () => {
      const newAppVersion = 'new app version';

      const listenerMetadataUpdatedSpy = jest.spyOn(listener, 'metadataUpdated');

      handleSessionConfigUpdated({ AppVersion: newAppVersion });

      expect(listenerMetadataUpdatedSpy).toHaveBeenCalledWith(
        APP_VERSION_KEY,
        await cipher.decrypt(newAppVersion)
      );
    });

    it('should call listner.resetAndReload when __destroyed: 1 is received', async () => {
      const listenerResetAndReloadSpy = jest.spyOn(listener, 'resetAndReload');

      handleSessionConfigUpdated({ __destroyed: '1' });

      expect(listenerResetAndReloadSpy).toHaveBeenCalled();
    });
  });
});

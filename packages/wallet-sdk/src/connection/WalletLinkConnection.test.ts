import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { Session } from '../relay/Session';
import { APP_VERSION_KEY, WALLET_USER_NAME_KEY } from '../relay/WalletSDKRelayAbstract';
import { SessionConfig } from './SessionConfig';
import { WalletLinkConnection } from './WalletLinkConnection';

describe('WalletLinkConnection', () => {
  const session = new Session(new ScopedLocalStorage('test'));

  const listener = {
    linkedUpdated: jest.fn(),
    connectedUpdated: jest.fn(),
    handleResponseMessage: jest.fn(),
    chainUpdated: jest.fn(),
    accountUpdated: jest.fn(),
    metadataUpdated: jest.fn(),
    resetAndReload: jest.fn(),
  };
  const cipher = {
    encrypt: jest.fn().mockImplementation((text) => Promise.resolve(`encrypted ${text}`)),
    decrypt: jest.fn().mockImplementation((text) => Promise.resolve(`decrypted ${text}`)),
  };
  let connection: WalletLinkConnection;

  beforeEach(() => {
    jest.clearAllMocks();

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
    function handleSessionConfigUpdated(metadata: SessionConfig['metadata']) {
      (connection as any).handleSessionConfigUpdated(metadata);
    }

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

    it('should call listner.chainUpdated when ChainId changed', async () => {
      const newChainId = 'new chain id';

      const listenerChainUpdatedSpy = jest.spyOn(listener, 'chainUpdated');

      handleSessionConfigUpdated({ ChainId: newChainId });

      expect(listenerChainUpdatedSpy).toHaveBeenCalledWith(await cipher.decrypt(newChainId));
    });
  });
});

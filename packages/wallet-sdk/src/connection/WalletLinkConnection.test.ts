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
    function invoke_handleSessionConfigUpdated(metadata: SessionConfig['metadata']) {
      (connection as any).handleSessionConfigUpdated(metadata);
    }

    it('should call listner.metadataUpdated when WalletUsername updated', async () => {
      const listener_metadataUpdatedSpy = jest.spyOn(listener, 'metadataUpdated');

      const newUsername = 'new username';

      invoke_handleSessionConfigUpdated({ WalletUsername: newUsername });

      expect(cipher.decrypt).toHaveBeenCalledWith(newUsername);
      expect(listener_metadataUpdatedSpy).toHaveBeenCalledWith(
        WALLET_USER_NAME_KEY,
        await cipher.decrypt(newUsername)
      );
    });

    it('should call listner.metadataUpdated when AppVersion updated', async () => {
      const listener_metadataUpdatedSpy = jest.spyOn(listener, 'metadataUpdated');

      const newAppVersion = 'new app version';

      invoke_handleSessionConfigUpdated({ AppVersion: newAppVersion });

      expect(listener_metadataUpdatedSpy).toHaveBeenCalledWith(
        APP_VERSION_KEY,
        await cipher.decrypt(newAppVersion)
      );
    });

    it('should call listner.resetAndReload when __destroyed: 1 is received', async () => {
      const listener_resetAndReloadSpy = jest.spyOn(listener, 'resetAndReload');

      invoke_handleSessionConfigUpdated({ __destroyed: '1' });

      expect(listener_resetAndReloadSpy).toHaveBeenCalled();
    });

    it('should call listner.accountUpdated when Account updated', async () => {
      const listener_accountUpdatedSpy = jest.spyOn(listener, 'accountUpdated');

      const newAccount = 'new account';

      invoke_handleSessionConfigUpdated({ EthereumAddress: newAccount });

      expect(listener_accountUpdatedSpy).toHaveBeenCalledWith(await cipher.decrypt(newAccount));
    });

    describe('chain updates', () => {
      it('should NOT call listner.chainUpdated when only one changed', async () => {
        const listener_chainUpdatedSpy = jest.spyOn(listener, 'chainUpdated');

        const chainIdUpdate = { ChainId: 'new chain id' };
        const jsonRpcUrlUpdate = { JsonRpcUrl: 'new json rpc url' };

        invoke_handleSessionConfigUpdated(chainIdUpdate);
        invoke_handleSessionConfigUpdated(jsonRpcUrlUpdate);

        await cipher.decrypt(chainIdUpdate.ChainId);

        expect(listener_chainUpdatedSpy).not.toHaveBeenCalled();
      });

      it('should call listner.chainUpdated when both ChainId and JsonRpcUrl changed', async () => {
        const listener_chainUpdatedSpy = jest.spyOn(listener, 'chainUpdated');

        const update = {
          ChainId: 'new chain id',
          JsonRpcUrl: 'new json rpc url',
        };

        invoke_handleSessionConfigUpdated(update);

        expect(listener_chainUpdatedSpy).toHaveBeenCalledWith(
          await cipher.decrypt(update.ChainId),
          await cipher.decrypt(update.JsonRpcUrl)
        );
      });
    });
  });
});

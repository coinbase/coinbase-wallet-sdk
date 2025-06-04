import { vi } from 'vitest';

import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';
import { APP_VERSION_KEY, WALLET_USER_NAME_KEY } from '../constants.js';
import { WalletLinkSession } from '../type/WalletLinkSession.js';
import { WalletLinkCipher } from './WalletLinkCipher.js';
import {
  WalletLinkConnection,
  WalletLinkConnectionUpdateListener,
} from './WalletLinkConnection.js';

const decryptMock = vi.fn().mockImplementation((text) => Promise.resolve(`decrypted ${text}`));

vi.spyOn(WalletLinkCipher.prototype, 'decrypt').mockImplementation(decryptMock);

describe('WalletLinkConnection', () => {
  const session = WalletLinkSession.create(new ScopedLocalStorage('walletlink', 'test'));

  let connection: WalletLinkConnection;
  let listener: WalletLinkConnectionUpdateListener;
  let mockWorker: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
    };
    global.Worker = vi.fn().mockImplementation(() => mockWorker);

    connection = new WalletLinkConnection({
      session,
      linkAPIUrl: 'http://link-api-url',
      listener: {
        linkedUpdated: vi.fn(),
        handleWeb3ResponseMessage: vi.fn(),
        chainUpdated: vi.fn(),
        accountUpdated: vi.fn(),
        metadataUpdated: vi.fn(),
        resetAndReload: vi.fn(),
      },
    });
    listener = (connection as any).listener;
  });

  describe('incomingDataListener', () => {
    it('should call handleSessionMetadataUpdated when session config is updated', async () => {
      const handleSessionMetadataUpdatedSpy = vi.spyOn(
        connection as any,
        'handleSessionMetadataUpdated'
      );

      const sessionConfig = {
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

      expect(handleSessionMetadataUpdatedSpy).toHaveBeenCalledWith(sessionConfig.metadata);
    });
  });

  describe('handleSessionMetadataUpdated', () => {
    function invoke_handleSessionMetadataUpdated(metadata: { [_: string]: string }) {
      (connection as any).handleSessionMetadataUpdated(metadata);
    }

    it('should call listener.metadataUpdated when WalletUsername updated', async () => {
      const listener_metadataUpdatedSpy = vi.spyOn(listener, 'metadataUpdated');

      const newUsername = 'new username';

      invoke_handleSessionMetadataUpdated({ WalletUsername: newUsername });

      expect(listener_metadataUpdatedSpy).toHaveBeenCalledWith(
        WALLET_USER_NAME_KEY,
        await decryptMock(newUsername)
      );
    });

    it('should call listener.metadataUpdated when AppVersion updated', async () => {
      const listener_metadataUpdatedSpy = vi.spyOn(listener, 'metadataUpdated');

      const newAppVersion = 'new app version';

      invoke_handleSessionMetadataUpdated({ AppVersion: newAppVersion });

      expect(listener_metadataUpdatedSpy).toHaveBeenCalledWith(
        APP_VERSION_KEY,
        await decryptMock(newAppVersion)
      );
    });

    it('should call listener.resetAndReload when __destroyed: 1 is received', async () => {
      const listener_resetAndReloadSpy = vi.spyOn(listener, 'resetAndReload');

      invoke_handleSessionMetadataUpdated({ __destroyed: '1' });

      expect(listener_resetAndReloadSpy).toHaveBeenCalled();
    });

    it('should call listener.accountUpdated when Account updated', async () => {
      const listener_accountUpdatedSpy = vi.spyOn(listener, 'accountUpdated');

      const newAccount = 'new account';

      invoke_handleSessionMetadataUpdated({ EthereumAddress: newAccount });

      expect(listener_accountUpdatedSpy).toHaveBeenCalledWith(await decryptMock(newAccount));
    });

    describe('chain updates', () => {
      it('should NOT call listener.chainUpdated when only one changed', async () => {
        const listener_chainUpdatedSpy = vi.spyOn(listener, 'chainUpdated');

        const chainIdUpdate = { ChainId: 'new chain id' };
        const jsonRpcUrlUpdate = { JsonRpcUrl: 'new json rpc url' };

        invoke_handleSessionMetadataUpdated(chainIdUpdate);
        invoke_handleSessionMetadataUpdated(jsonRpcUrlUpdate);

        await decryptMock(chainIdUpdate.ChainId);

        expect(listener_chainUpdatedSpy).not.toHaveBeenCalled();
      });

      it('should call listener.chainUpdated when both ChainId and JsonRpcUrl changed', async () => {
        const listener_chainUpdatedSpy = vi.spyOn(listener, 'chainUpdated');

        const update = {
          ChainId: 'new chain id',
          JsonRpcUrl: 'new json rpc url',
        };

        invoke_handleSessionMetadataUpdated(update);

        expect(listener_chainUpdatedSpy).toHaveBeenCalledWith(
          await decryptMock(update.ChainId),
          await decryptMock(update.JsonRpcUrl)
        );
      });
    });
  });

  describe('Heartbeat Worker Management', () => {
    it('should create a heartbeat worker when startHeartbeat is called', () => {
      (connection as any).startHeartbeat();

      expect(global.Worker).toHaveBeenCalledWith(expect.any(URL), { type: 'module' });
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'start' });
    });

    it('should stop heartbeat worker when stopHeartbeat is called', () => {
      (connection as any).startHeartbeat();
      
      vi.clearAllMocks();

      (connection as any).stopHeartbeat();

      expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'stop' });
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should terminate existing worker before creating new one', () => {
      (connection as any).startHeartbeat();
      const firstWorker = mockWorker;

      const secondWorker = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        addEventListener: vi.fn(),
      };
      global.Worker = vi.fn().mockImplementation(() => secondWorker);

      (connection as any).startHeartbeat();

      // First worker should be terminated
      expect(firstWorker.terminate).toHaveBeenCalled();
      
      // New worker should be created and started
      expect(secondWorker.postMessage).toHaveBeenCalledWith({ type: 'start' });
    });

    it('should handle heartbeat messages from worker', () => {
      const heartbeatSpy = vi.spyOn(connection as any, 'heartbeat').mockImplementation(() => {});

      (connection as any).startHeartbeat();

      const messageListener = mockWorker.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];

      expect(messageListener).toBeDefined();

      messageListener({ data: { type: 'heartbeat' } });

      expect(heartbeatSpy).toHaveBeenCalled();
    });

    it('should handle stop when no worker exists', () => {
      expect(() => {
        (connection as any).stopHeartbeat();
      }).not.toThrow();

      expect(mockWorker.postMessage).not.toHaveBeenCalled();
      expect(mockWorker.terminate).not.toHaveBeenCalled();
    });

    it('should setup worker listeners correctly', () => {
      (connection as any).startHeartbeat();

      expect(mockWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWorker.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});

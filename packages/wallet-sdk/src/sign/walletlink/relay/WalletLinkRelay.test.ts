/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi } from 'vitest';

import { WalletLinkCipher } from './connection/WalletLinkCipher.js';
import { WalletLinkConnection } from './connection/WalletLinkConnection.js';
import { WalletLinkWebSocket } from './connection/WalletLinkWebSocket.js';
import { WALLET_USER_NAME_KEY } from './constants.js';
import { ServerMessage } from './type/ServerMessage.js';
import { WalletLinkRelay, WalletLinkRelayOptions } from './WalletLinkRelay.js';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';

const decryptMock = vi.fn().mockImplementation((text) => text);

vi.spyOn(WalletLinkCipher.prototype, 'decrypt').mockImplementation(decryptMock);

describe('WalletLinkRelay', () => {
  const options: WalletLinkRelayOptions = {
    linkAPIUrl: 'http://link-api-url',
    storage: new ScopedLocalStorage('walletlink', 'test'),
    metadata: {
      appName: 'test app',
      appLogoUrl: '',
      appChainIds: [],
    },
    accountsCallback: vi.fn(),
    chainCallback: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(WalletLinkWebSocket.prototype, 'connect').mockReturnValue(Promise.resolve());
  });

  describe('resetAndReload', () => {
    it('should destroy the connection and connect again', async () => {
      const destroySpy = vi.spyOn(WalletLinkConnection.prototype, 'destroy');

      const relay = new WalletLinkRelay(options);
      relay.resetAndReload();

      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should call handleIncomingEvent', async () => {
      const serverMessageEvent: ServerMessage = {
        type: 'Event',
        sessionId: 'sessionId',
        eventId: 'eventId',
        event: 'Web3Response',
        data: JSON.stringify({
          id: 137,
          type: 'WEB3_RESPONSE',
          response: 'response mock',
        }),
      };

      const relay = new WalletLinkRelay(options);

      const handleWeb3ResponseMessageSpy = vi
        .spyOn(relay, 'handleWeb3ResponseMessage')
        .mockReturnValue();

      (relay as any).connection.ws.incomingDataListener?.(serverMessageEvent);

      const message = JSON.parse(await decryptMock(serverMessageEvent.data));
      expect(handleWeb3ResponseMessageSpy).toHaveBeenCalledWith(message.id, message.response);
    });

    it('should set isLinked with LinkedListener', async () => {
      const relay = new WalletLinkRelay(options);
      expect(relay.isLinked).toBeFalsy();

      (relay as any).connection.ws.incomingDataListener?.({
        type: 'IsLinkedOK',
        linked: true,
      });

      expect(relay.isLinked).toEqual(true);
    });
  });

  describe('setSessionConfigListener', () => {
    it('should update metadata with setSessionConfigListener', async () => {
      const sessionConfig = {
        webhookId: 'webhookId',
        webhookUrl: 'webhookUrl',
        metadata: {
          WalletUsername: 'username',
        },
      };

      const relay = new WalletLinkRelay(options);

      const metadataUpdatedSpy = vi.spyOn(relay, 'metadataUpdated');

      (relay as any).connection.ws.incomingDataListener?.({
        ...sessionConfig,
        type: 'SessionConfigUpdated',
      });

      expect(metadataUpdatedSpy).toHaveBeenCalledWith(
        WALLET_USER_NAME_KEY,
        await decryptMock(sessionConfig.metadata.WalletUsername)
      );
    });

    it('should update chainId and jsonRpcUrl only when distinct', async () => {
      const relay = new WalletLinkRelay(options);
      const callback = options.chainCallback;

      const sessionConfig = {
        webhookId: 'webhookId',
        webhookUrl: 'webhookUrl',
        metadata: {
          ChainId: '12345',
          JsonRpcUrl: 'JsonRpcUrl',
        },
      };

      // initial chain id and json rpc url
      (relay as any).connection.ws.incomingDataListener?.({
        ...sessionConfig,
        type: 'GetSessionConfigOK',
      });
      expect(callback).toHaveBeenCalledWith(
        await decryptMock(sessionConfig.metadata.JsonRpcUrl),
        Number(await decryptMock(sessionConfig.metadata.ChainId))
      );

      // same chain id and json rpc url
      (relay as any).connection.ws.incomingDataListener?.({
        ...sessionConfig,
        type: 'SessionConfigUpdated',
      });
      expect(callback).toHaveBeenCalledTimes(1); // distinctUntilChanged

      // different chain id and json rpc url
      const newSessionConfig = {
        ...sessionConfig,
        metadata: {
          ChainId: 'ChainId2',
          JsonRpcUrl: 'JsonRpcUrl2',
        },
      };

      (relay as any).connection.ws.incomingDataListener?.({
        ...newSessionConfig,
        type: 'SessionConfigUpdated',
      });

      expect(callback).toHaveBeenCalledWith(
        await decryptMock(newSessionConfig.metadata.JsonRpcUrl),
        Number(await decryptMock(newSessionConfig.metadata.ChainId))
      );
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});

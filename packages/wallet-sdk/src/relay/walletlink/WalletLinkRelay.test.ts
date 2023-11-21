/* eslint-disable @typescript-eslint/no-explicit-any */

import { Cipher } from '../../lib/Cipher';
import { ScopedLocalStorage } from '../../lib/ScopedLocalStorage';
import { WALLET_USER_NAME_KEY } from '../RelayAbstract';
import { RelayEventManager } from '../RelayEventManager';
import { WalletLinkConnection } from './connection/WalletLinkConnection';
import { WalletLinkWebSocket } from './connection/WalletLinkWebSocket';
import { ServerMessage } from './type/ServerMessage';
import { SessionConfig } from './type/SessionConfig';
import { WalletLinkRelay, WalletLinkRelayOptions } from './WalletLinkRelay';

const decryptMock = jest.fn().mockImplementation((text) => Promise.resolve(`"decrypted ${text}"`));

jest.spyOn(Cipher.prototype, 'decrypt').mockImplementation(decryptMock);

describe('WalletLinkRelay', () => {
  const options: WalletLinkRelayOptions = {
    linkAPIUrl: 'http://link-api-url',
    version: '0.0.0',
    darkMode: false,
    storage: new ScopedLocalStorage('test'),
    relayEventManager: new RelayEventManager(),
    uiConstructor: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(WalletLinkWebSocket.prototype, 'connect').mockReturnValue(Promise.resolve());
  });

  describe('resetAndReload', () => {
    it('should destroy the connection and connect again', async () => {
      const setSessionMetadataSpy = jest.spyOn(
        WalletLinkConnection.prototype,
        'setSessionMetadata'
      );

      const relay = new WalletLinkRelay(options);
      relay.resetAndReload();

      expect(setSessionMetadataSpy).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should call handleIncomingEvent', async () => {
      const serverMessageEvent: ServerMessage = {
        type: 'Event',
        sessionId: 'sessionId',
        eventId: 'eventId',
        event: 'Web3Response',
        data: 'data',
      };

      jest.spyOn(JSON, 'parse').mockImplementation(() => {
        return {
          type: 'WEB3_RESPONSE',
          data: 'decrypted data',
        };
      });

      const relay = new WalletLinkRelay(options);

      const handleWeb3ResponseMessageSpy = jest.spyOn(relay, 'handleWeb3ResponseMessage');

      (relay as any).connection.ws.incomingDataListener?.(serverMessageEvent);

      expect(handleWeb3ResponseMessageSpy).toHaveBeenCalledWith(
        JSON.parse(await decryptMock(serverMessageEvent.data))
      );
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
      const sessionConfig: SessionConfig = {
        webhookId: 'webhookId',
        webhookUrl: 'webhookUrl',
        metadata: {
          WalletUsername: 'username',
        },
      };

      const relay = new WalletLinkRelay(options);

      const metadataUpdatedSpy = jest.spyOn(relay, 'metadataUpdated');

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
      const callback = jest.fn();
      const relay = new WalletLinkRelay(options);
      relay.setChainCallback(callback);

      const sessionConfig: SessionConfig = {
        webhookId: 'webhookId',
        webhookUrl: 'webhookUrl',
        metadata: {
          ChainId: 'ChainId',
          JsonRpcUrl: 'JsonRpcUrl',
        },
      };

      // initial chain id and json rpc url
      (relay as any).connection.ws.incomingDataListener?.({
        ...sessionConfig,
        type: 'GetSessionConfigOK',
      });
      expect(callback).toHaveBeenCalledWith(
        await decryptMock(sessionConfig.metadata.ChainId),
        await decryptMock(sessionConfig.metadata.JsonRpcUrl)
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
        await decryptMock(newSessionConfig.metadata.ChainId),
        await decryptMock(newSessionConfig.metadata.JsonRpcUrl)
      );
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});

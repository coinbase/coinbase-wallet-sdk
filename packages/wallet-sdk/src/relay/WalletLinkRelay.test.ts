/* eslint-disable @typescript-eslint/no-explicit-any */

import { ServerMessageEvent } from '../connection/ServerMessage';
import { SessionConfig } from '../connection/SessionConfig';
import { WalletLinkConnection } from '../connection/WalletLinkConnection';
import { WalletLinkConnectionCipher } from '../connection/WalletLinkConnectionCipher';
import { WalletLinkWebSocket } from '../connection/WalletLinkWebSocket';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { WalletLinkRelay, WalletLinkRelayOptions } from './WalletLinkRelay';
import { WALLET_USER_NAME_KEY } from './WalletSDKRelayAbstract';
import { WalletSDKRelayEventManager } from './WalletSDKRelayEventManager';

// mock isWeb3ResponseMessage to return true
jest.mock('./Web3ResponseMessage', () => ({
  isWeb3ResponseMessage: jest.fn().mockReturnValue(true),
}));

const decryptMock = jest.fn().mockImplementation((text) => Promise.resolve(`"decrypted ${text}"`));

jest.spyOn(WalletLinkConnectionCipher.prototype, 'decrypt').mockImplementation(decryptMock);

describe('WalletLinkRelay', () => {
  const options: WalletLinkRelayOptions = {
    linkAPIUrl: 'http://link-api-url',
    version: '0.0.0',
    darkMode: false,
    storage: new ScopedLocalStorage('test'),
    relayEventManager: new WalletSDKRelayEventManager(),
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
      const serverMessageEvent: ServerMessageEvent = {
        type: 'Event',
        sessionId: 'sessionId',
        eventId: 'eventId',
        event: 'Web3Response',
        data: 'data',
      };

      const relay = new WalletLinkRelay(options);

      const handleWeb3ResponseMessageSpy = jest.spyOn(relay, 'handleWeb3ResponseMessage');

      (relay as any).connection.websocketMessageReceived(serverMessageEvent);

      expect(handleWeb3ResponseMessageSpy).toHaveBeenCalledWith(
        JSON.parse(await decryptMock(serverMessageEvent.data))
      );
    });

    it('should set isLinked with LinkedListener', async () => {
      const relay = new WalletLinkRelay(options);
      expect(relay.isLinked).toBeFalsy();

      (relay as any).connection.websocketMessageReceived({
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

      (relay as any).connection.websocketMessageReceived({
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
      (relay as any).connection.websocketMessageReceived({
        ...sessionConfig,
        type: 'GetSessionConfigOK',
      });
      expect(callback).toHaveBeenCalledWith(
        await decryptMock(sessionConfig.metadata.ChainId),
        await decryptMock(sessionConfig.metadata.JsonRpcUrl)
      );

      // same chain id and json rpc url
      (relay as any).connection.websocketMessageReceived({
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

      (relay as any).connection.websocketMessageReceived({
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

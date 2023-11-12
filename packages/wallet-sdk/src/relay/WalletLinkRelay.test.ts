/* eslint-disable @typescript-eslint/no-explicit-any */

import { ServerMessageEvent } from '../connection/ServerMessage';
import { SessionConfig } from '../connection/SessionConfig';
import { WalletLinkConnection } from '../connection/WalletLinkConnection';
import { WalletLinkWebSocket } from '../connection/WalletLinkWebSocket';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { WalletLinkRelay, WalletLinkRelayOptions } from './WalletLinkRelay';
import { WalletSDKRelayEventManager } from './WalletSDKRelayEventManager';

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

      const handleIncomingEventSpy = jest.spyOn(relay, <any>'handleIncomingEvent');

      (relay as any).connection.ws.incomingDataListener?.(serverMessageEvent);

      expect(handleIncomingEventSpy).toHaveBeenCalledWith(serverMessageEvent);
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
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(callback).toHaveBeenCalledWith('ChainId', 'JsonRpcUrl');

      // same chain id and json rpc url
      (relay as any).connection.ws.incomingDataListener?.({
        ...sessionConfig,
        type: 'SessionConfigUpdated',
      });
      expect(callback).toHaveBeenCalledTimes(1); // distinctUntilChanged

      // different chain id and json rpc url
      (relay as any).connection.ws.incomingDataListener?.({
        ...sessionConfig,
        metadata: {
          ChainId: 'ChainId2',
          JsonRpcUrl: 'JsonRpcUrl2',
        },
        type: 'SessionConfigUpdated',
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(callback).toHaveBeenCalledWith('ChainId2', 'JsonRpcUrl2');
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});

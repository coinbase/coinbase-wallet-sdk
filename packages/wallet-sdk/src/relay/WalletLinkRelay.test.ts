/* eslint-disable @typescript-eslint/no-explicit-any */

import { Observable } from 'rxjs';

import { RxWebSocket } from '../connection/RxWebSocket';
import { ServerMessageEvent } from '../connection/ServerMessage';
import { SessionConfig } from '../connection/SessionConfig';
import { WalletLinkConnection } from '../connection/WalletLinkConnection';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import * as aes256gcm from './aes256gcm';
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
    jest.spyOn(RxWebSocket.prototype, 'connect').mockReturnValue(new Observable());
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

      const setIncomingEventListenerSpy = jest.spyOn(
        WalletLinkConnection.prototype,
        'setIncomingEventListener'
      );

      const relay = new WalletLinkRelay(options);

      const handleIncomingEventSpy = jest.spyOn(relay, <any>'handleIncomingEvent');

      expect(setIncomingEventListenerSpy).toHaveBeenCalled();

      (relay as any).connection.ws.incomingDataSubject.next(JSON.stringify(serverMessageEvent));

      expect(handleIncomingEventSpy).toHaveBeenCalledWith(serverMessageEvent);
    });

    it('should set isLinked with LinkedListener', async () => {
      const setLinkedListenerSpy = jest.spyOn(WalletLinkConnection.prototype, 'setLinkedListener');

      const relay = new WalletLinkRelay(options);
      expect(relay.isLinked).toBeFalsy();

      expect(setLinkedListenerSpy).toHaveBeenCalled();

      (relay as any).connection.ws.incomingDataSubject.next(
        JSON.stringify({
          type: 'IsLinkedOK',
          linked: true,
        })
      );

      expect(relay.isLinked).toEqual(true);
    });
  });

  describe('setSessionConfigListener', () => {
    it('should call setSessionConfigListener', async () => {
      const setSessionConfigListenerSpy = jest.spyOn(
        WalletLinkConnection.prototype,
        'setSessionConfigListener'
      );

      new WalletLinkRelay(options);

      expect(setSessionConfigListenerSpy).toHaveBeenCalled();
    });

    it('should handle session config changes', async () => {
      const sessionConfig: SessionConfig = {
        webhookId: 'webhookId',
        webhookUrl: 'webhookUrl',
        metadata: {},
      };

      const relay = new WalletLinkRelay(options);

      const onSessionConfigChangedSpy = jest.spyOn(relay, <any>'onSessionConfigChanged');

      (relay as any).connection.ws.incomingDataSubject.next(
        JSON.stringify({
          ...sessionConfig,
          type: 'GetSessionConfigOK',
        })
      );

      expect(onSessionConfigChangedSpy).toHaveBeenCalledWith(sessionConfig);
    });

    it('should update metadata with setSessionConfigListener', async () => {
      const sessionConfig: SessionConfig = {
        webhookId: 'webhookId',
        webhookUrl: 'webhookUrl',
        metadata: {
          WalletUsername: 'username',
        },
      };

      const decryptSpy = jest.spyOn(aes256gcm, 'decrypt');

      const relay = new WalletLinkRelay(options);

      (relay as any).connection.ws.incomingDataSubject.next(
        JSON.stringify({
          ...sessionConfig,
          type: 'SessionConfigUpdated',
        })
      );

      expect(decryptSpy).toHaveBeenCalledWith(
        sessionConfig.metadata.WalletUsername,
        expect.anything()
      );
    });

    it('should update chainId and jsonRpcUrl only when distinct', async () => {
      jest.spyOn(aes256gcm, 'decrypt').mockImplementation(async (input, _secret) => {
        return input;
      });

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
      (relay as any).connection.ws.incomingDataSubject.next(
        JSON.stringify({
          ...sessionConfig,
          type: 'GetSessionConfigOK',
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(callback).toHaveBeenCalledWith('ChainId', 'JsonRpcUrl');

      // same chain id and json rpc url
      (relay as any).connection.ws.incomingDataSubject.next(
        JSON.stringify({
          ...sessionConfig,
          type: 'SessionConfigUpdated',
        })
      );
      expect(callback).toHaveBeenCalledTimes(1); // distinctUntilChanged

      // different chain id and json rpc url
      (relay as any).connection.ws.incomingDataSubject.next(
        JSON.stringify({
          ...sessionConfig,
          metadata: {
            ChainId: 'ChainId2',
            JsonRpcUrl: 'JsonRpcUrl2',
          },
          type: 'SessionConfigUpdated',
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(callback).toHaveBeenCalledWith('ChainId2', 'JsonRpcUrl2');
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});

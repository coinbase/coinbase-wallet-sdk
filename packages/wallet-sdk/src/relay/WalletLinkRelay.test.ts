/* eslint-disable @typescript-eslint/no-explicit-any */
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

      const setIncomingEventListnerSpy = jest.spyOn(
        WalletLinkConnection.prototype,
        'setIncomingEventListner'
      );

      const relay = new WalletLinkRelay(options);

      const handleIncomingEventSpy = jest.spyOn(relay, <any>'handleIncomingEvent');

      expect(setIncomingEventListnerSpy).toHaveBeenCalled();

      (relay as any).connection.ws.incomingDataSubject.next(JSON.stringify(serverMessageEvent));

      expect(handleIncomingEventSpy).toHaveBeenCalledWith(serverMessageEvent);
    });

    it('should set isLinked with LinkedListner', async () => {
      const setLinkedListnerSpy = jest.spyOn(WalletLinkConnection.prototype, 'setLinkedListner');

      const relay = new WalletLinkRelay(options);
      expect(relay.isLinked).toBeFalsy();

      expect(setLinkedListnerSpy).toHaveBeenCalled();

      (relay as any).connection.ws.incomingDataSubject.next(
        JSON.stringify({
          type: 'IsLinkedOK',
          linked: true,
        })
      );

      expect(relay.isLinked).toEqual(true);
    });
  });

  describe('setSessionConfigListner', () => {
    it('should call setSessionConfigListner', async () => {
      const setSessionConfigListnerSpy = jest.spyOn(
        WalletLinkConnection.prototype,
        'setSessionConfigListner'
      );

      new WalletLinkRelay(options);

      expect(setSessionConfigListnerSpy).toHaveBeenCalled();
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

    it('should update metadata with setSessionConfigListner', async () => {
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
  });
});

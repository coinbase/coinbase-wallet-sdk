import { WS } from 'jest-websocket-mock';
import { vi } from 'vitest';

import { ServerMessage } from '../type/ServerMessage.js';
import { ConnectionState, WalletLinkWebSocket } from './WalletLinkWebSocket.js';
import { IntNumber } from ':core/type/index.js';

describe('WalletLinkWebSocket', () => {
  let server: WS;
  let rxWS: WalletLinkWebSocket;
  beforeEach(() => {
    server = new WS('ws://localhost:1234');
    rxWS = new WalletLinkWebSocket('http://localhost:1234');
  });

  afterEach(() => {
    WS.clean();
  });

  describe('is connected', () => {
    test('@connect & @disconnect', async () => {
      const connectionStateListener = vi.fn();
      rxWS.setConnectionStateListener(connectionStateListener);

      await rxWS.connect();
      await server.connected;

      expect(connectionStateListener).toHaveBeenCalledWith(ConnectionState.CONNECTED);

      // Sends data
      const webSocketSendMock = vi.spyOn(WebSocket.prototype, 'send').mockImplementation(() => {});

      rxWS.sendData('data');
      expect(webSocketSendMock).toHaveBeenCalledWith('data');

      // Disconnects
      rxWS.disconnect();
      expect(connectionStateListener).toHaveBeenCalledWith(ConnectionState.DISCONNECTED);
      // @ts-expect-error test private methods
      expect(rxWS.webSocket).toBe(null);
    });

    describe('errors & event listeners', () => {
      afterEach(() => rxWS.disconnect());

      test('@connect throws error when connecting again', async () => {
        await rxWS.connect();

        await expect(rxWS.connect()).rejects.toThrow('webSocket object is not null');
      });

      test('@connect throws error & fails to set websocket instance', async () => {
        const errorConnect = new WalletLinkWebSocket('');

        await expect(errorConnect.connect()).rejects.toThrow(
          "Failed to construct 'WebSocket': 1 argument required, but only 0 present."
        );
      });

      test('onclose event throws error', async () => {
        await rxWS.connect();
        await server.connected;
        server.error();

        await expect(rxWS.connect()).rejects.toThrow('websocket error 1000: ');
      });

      test('onmessage event emits message', async () => {
        const incomingDataListener = vi.fn();
        rxWS.setIncomingDataListener(incomingDataListener);

        await rxWS.connect();
        await server.connected;

        const message: ServerMessage = {
          type: 'OK',
          id: IntNumber(1),
          sessionId: '123',
        };

        server.send(JSON.stringify(message));
        expect(incomingDataListener).toHaveBeenCalledWith(message);
      });

      test('onmessage event emits heartbeat message', async () => {
        const incomingDataListener = vi.fn();
        rxWS.setIncomingDataListener(incomingDataListener);

        await rxWS.connect();
        await server.connected;

        server.send('h');
        expect(incomingDataListener).toHaveBeenCalledWith({
          type: 'Heartbeat',
        });
      });
    });
  });

  describe('is not connected', () => {
    test('disconnect returns', () => {
      const webSocketCloseMock = vi
        .spyOn(WebSocket.prototype, 'close')
        .mockImplementation(() => {});

      rxWS.disconnect();
      expect(webSocketCloseMock).not.toBeCalled();
    });
  });
});

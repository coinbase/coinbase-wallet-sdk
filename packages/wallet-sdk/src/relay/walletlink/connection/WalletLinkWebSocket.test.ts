import WS from 'jest-websocket-mock';

import { IntNumber } from '../types';
import { ServerMessage } from './ServerMessage';
import { ConnectionState, WalletLinkWebSocket } from './WalletLinkWebSocket';

describe('WalletLinkWebSocket', () => {
  const session = new Session(new ScopedLocalStorage('test'));

  let server: WS;
  let wlWebsocket: WalletLinkWebSocket;
  let listener: WalletLinkWebSocketUpdateListener;

  beforeEach(() => {
    server = new WS('ws://localhost:1234/rpc');

    listener = {
      websocketConnectionStateUpdated: jest.fn(),
      websocketLinkedUpdated: jest.fn(),
      websocketServerMessageReceived: jest.fn(),
      websocketSessionMetadataUpdated: jest.fn(),
    };

    wlWebsocket = new WalletLinkWebSocket({
      linkAPIUrl: 'http://localhost:1234',
      session,
      listener,
    });
  });

  afterEach(() => {
    WS.clean();
  });

  describe('is connected', () => {
    test('@connect & @disconnect', async () => {
      const connectionStateListener = jest.spyOn(listener, 'websocketConnectionStateUpdated');

      await wlWebsocket.connect();
      await server.connected;

      expect(connectionStateListener).toHaveBeenCalledWith(ConnectionState.CONNECTED);

      // Sends data
      const webSocketSendMock = jest
        .spyOn(WebSocket.prototype, 'send')
        .mockImplementation(() => {});

      wlWebsocket.sendMessage({
        type: 'ClientMessageType',
        id: IntNumber(1),
      });
      expect(webSocketSendMock).toHaveBeenCalled();

      // Disconnects
      wlWebsocket.disconnect();
      expect(connectionStateListener).toHaveBeenCalledWith(ConnectionState.DISCONNECTED);
      // @ts-expect-error test private methods
      expect(wlWebsocket.webSocket).toBe(null);
    });

    describe('errors & event listeners', () => {
      afterEach(() => wlWebsocket.disconnect());

      test('@connect throws error when connecting again', async () => {
        await wlWebsocket.connect();

        await expect(wlWebsocket.connect()).rejects.toThrow('webSocket object is not null');
      });

      test('@connect throws error & fails to set websocket instance', async () => {
        const errorConnect = new WalletLinkWebSocket({
          linkAPIUrl: '',
          session,
          listener,
        });

        await expect(errorConnect.connect()).rejects.toThrow("Failed to construct 'WebSocket':");
      });

      test('onclose event throws error', async () => {
        await wlWebsocket.connect();
        await server.connected;
        server.error();

        await expect(wlWebsocket.connect()).rejects.toThrow('websocket error 1000: ');
      });

      test('onmessage event emits message', async () => {
        const incomingDataListener = jest.spyOn(listener, 'websocketServerMessageReceived');

        await wlWebsocket.connect();
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
        const incomingDataListener = jest.spyOn(listener, 'websocketServerMessageReceived');

        await wlWebsocket.connect();
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
      const webSocketCloseMock = jest
        .spyOn(WebSocket.prototype, 'close')
        .mockImplementation(() => {});

      wlWebsocket.disconnect();
      expect(webSocketCloseMock).not.toBeCalled();
    });
  });
});

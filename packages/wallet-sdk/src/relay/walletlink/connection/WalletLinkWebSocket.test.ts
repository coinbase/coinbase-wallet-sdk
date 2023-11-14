import WS from 'jest-websocket-mock';

import {
  ConnectionState,
  WalletLinkWebSocket,
  WalletLinkWebSocketUpdateListener,
} from './WalletLinkWebSocket';

describe('WalletLinkWebSocket', () => {
  let server: WS;
  let wlWebsocket: WalletLinkWebSocket;
  let listener: WalletLinkWebSocketUpdateListener;

  beforeEach(() => {
    server = new WS('ws://localhost:1234');
    wlWebsocket = new WalletLinkWebSocket({
      url: 'http://localhost:1234',
      listener: { websocketConnectionStateUpdated: jest.fn(), websocketMessageReceived: jest.fn() },
    });
    listener = (wlWebsocket as any).listener;
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

      wlWebsocket.sendData('data');
      expect(webSocketSendMock).toHaveBeenCalledWith('data');

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
          url: '',
          listener: {
            websocketConnectionStateUpdated: jest.fn(),
            websocketMessageReceived: jest.fn(),
          },
        });

        await expect(errorConnect.connect()).rejects.toThrow(
          "Failed to construct 'WebSocket': 1 argument required, but only 0 present."
        );
      });

      test('onclose event throws error', async () => {
        await wlWebsocket.connect();
        await server.connected;
        server.error();

        await expect(wlWebsocket.connect()).rejects.toThrow('websocket error 1000: ');
      });

      test('onmessage event emits message', async () => {
        const incomingDataListener = jest.spyOn(listener, 'websocketMessageReceived');

        await wlWebsocket.connect();
        await server.connected;

        const message = {
          type: 'ServerMessageType',
          data: 'hello world',
        };

        server.send(JSON.stringify(message));
        expect(incomingDataListener).toHaveBeenCalledWith(message);
      });

      test('onmessage event emits heartbeat message', async () => {
        const incomingDataListener = jest.spyOn(listener, 'websocketMessageReceived');

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

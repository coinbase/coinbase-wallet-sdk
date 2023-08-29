import WS from 'jest-websocket-mock';
import { Observable } from 'rxjs';

import { ConnectionState, RxWebSocket } from './RxWebSocket';

describe('RxWebSocket', () => {
  let server: WS;
  let rxWS: RxWebSocket;
  beforeEach(() => {
    server = new WS('ws://localhost:1234');
    rxWS = new RxWebSocket('http://localhost:1234');
  });

  afterEach(() => {
    WS.clean();
  });

  describe('is connected', () => {
    test('@connect & @disconnect', async () => {
      const client = rxWS.connect();

      expect(client).toBeInstanceOf(Observable);
      await client.toPromise();
      await server.connected;

      // @ts-expect-error test private methods
      expect(rxWS.webSocket).toBeInstanceOf(WebSocket);
      // @ts-expect-error test private methods
      rxWS.connectionStateSubject
        .subscribe({
          next: (val) => {
            //  Connected state
            expect(val).toEqual(ConnectionState.CONNECTED);
          },
          closed: (val: ConnectionState) => {
            //  Disconnected state
            expect(val).toEqual(ConnectionState.DISCONNECTED);
          },
        })
        .unsubscribe();

      // Sends data
      const webSocketSendMock = jest
        .spyOn(WebSocket.prototype, 'send')
        .mockImplementation(() => {});

      rxWS.sendData('data');
      expect(webSocketSendMock).toHaveBeenCalledWith('data');

      // Disconnects
      rxWS.disconnect();
      // @ts-expect-error test private methods
      expect(rxWS.webSocket).toBe(null);
    });

    test('@connectionState$ & @incomingData$', () => {
      expect(rxWS.connectionState$).toBeInstanceOf(Observable);
      expect(rxWS.incomingData$).toBeInstanceOf(Observable);
    });

    test('@incomingJSONData$', () => {
      expect(rxWS.incomingJSONData$).toBeInstanceOf(Observable);
    });

    describe('errors & event listeners', () => {
      afterEach(() => rxWS.disconnect());

      test('@connect throws error when connecting again', async () => {
        const client = rxWS.connect();
        await client.toPromise();

        await expect(rxWS.connect().toPromise()).rejects.toThrow('webSocket object is not null');
      });

      test('@connect throws error & fails to set websocket instance', async () => {
        const errorConnect = new RxWebSocket('');

        await expect(errorConnect.connect().toPromise()).rejects.toThrow(
          "Failed to construct 'WebSocket': 1 argument required, but only 0 present."
        );
      });

      test('onclose event throws error', async () => {
        const client = rxWS.connect();
        await client.toPromise();
        await server.connected;
        server.error();

        await expect(rxWS.connect().toPromise()).rejects.toThrow('websocket error 1000: ');
      });

      test('onmessage event emits message', async () => {
        const client = rxWS.connect();
        await client.toPromise();
        await server.connected;

        // @ts-expect-error test private methods
        rxWS.incomingDataSubject.subscribe((val) => expect(val).toEqual('hello world'));
        server.send('hello world');
      });
    });
  });

  describe('is not connected', () => {
    test('disconnect returns', () => {
      const webSocketCloseMock = jest
        .spyOn(WebSocket.prototype, 'close')
        .mockImplementation(() => {});

      rxWS.disconnect();
      expect(webSocketCloseMock).not.toBeCalled();
    });
  });
});

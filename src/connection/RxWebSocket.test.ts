import WS from "jest-websocket-mock";
import { Observable } from "rxjs";

import { ConnectionState, RxWebSocket } from "./RxWebSocket";

describe("RxWebSocket", () => {
  let server: WS;
  let rxWS: RxWebSocket;
  beforeEach(() => {
    server = new WS("ws://localhost:1234");
    rxWS = new RxWebSocket("http://localhost:1234");
  });

  afterEach(() => {
    server.close();
  });
  test("@connect & @disconnect", async () => {
    const client = rxWS.connect();

    expect(client).toBeInstanceOf(Observable);
    await client.toPromise();
    await server.connected; // wait for the server to have established the connection

    // the mock websocket server will record all the messages it receives
    // rxWS.sendData("hello");

    // the mock websocket server can also send messages to all connected clients
    // server.send("hello everyone");
    // @ts-expect-error test private methods
    expect(rxWS.webSocket).toBeInstanceOf(WebSocket);
    // @ts-expect-error test private methods
    rxWS.connectionStateSubject.subscribe({
      next: val => {
        expect(val).toEqual(ConnectionState.CONNECTED);
      },
      closed: (val: ConnectionState) => {
        expect(val).toEqual(ConnectionState.DISCONNECTED);
      },
    });

    const webSocketSendMock = jest
      .spyOn(WebSocket.prototype, "send")
      .mockImplementation(() => "send");
    rxWS.sendData("data");
    expect(webSocketSendMock).toHaveBeenCalledWith("data");

      rxWS.disconnect();
      // @ts-expect-error test private methods
      expect(rxWS.webSocket).toBe(null);
  });

  test("@connectionState$ & @incomingData$", () => {
    expect(rxWS.incomingData$).toBeInstanceOf(Observable);
  });

  test("@incomingJSONData$", () => {
    expect(rxWS.incomingJSONData$).toBeInstanceOf(Observable);
  });
});

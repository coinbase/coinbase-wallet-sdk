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
    await server.connected;

    // @ts-expect-error test private methods
    expect(rxWS.webSocket).toBeInstanceOf(WebSocket);
    // @ts-expect-error test private methods
    rxWS.connectionStateSubject.subscribe({
      next: val => {
        //  Connected state
        expect(val).toEqual(ConnectionState.CONNECTED);
      },
      closed: (val: ConnectionState) => {
        //  Disconnected state
        expect(val).toEqual(ConnectionState.DISCONNECTED);
      },
    });

    // Sends data
    const webSocketSendMock = jest
      .spyOn(WebSocket.prototype, "send")
      .mockImplementation(() => "send");

    rxWS.sendData("data");
    expect(webSocketSendMock).toHaveBeenCalledWith("data");

    // Disconnects
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

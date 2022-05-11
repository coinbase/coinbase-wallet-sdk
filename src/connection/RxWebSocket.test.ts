import { Observable } from "rxjs";
import { EventEmitter } from "stream";

import { ConnectionState, RxWebSocket } from "./RxWebSocket";

class MockWebSocket extends EventEmitter {
  readonly url: string | URL;
  readonly protocols: string | string[] | undefined;
  constructor(url: string | URL) {
    super();
    this.url = url;
  }
  send(data: string) {
    return data;
  }
  close() {
    this.emit("close");
  }
}

describe("RxWebSocket", () => {
  test("@connect & @disconnect", async () => {
    const rxWS = new RxWebSocket("http://link-url.com");
    const rxWsRes = await rxWS.connect();

    expect(rxWsRes).toBeInstanceOf(Observable);
    expect(rxWsRes.toPromise()).toBeTruthy();

    // @ts-expect-error test private methods
    expect(rxWS.webSocket).toBeInstanceOf(WebSocket);

    await rxWS.disconnect();
    // @ts-expect-error test private methods
    expect(rxWS.webSocket).toBe(null);
  });

  test("@sendData", () => {
    const webSocketSendMock = jest
      .spyOn(WebSocket.prototype, "send")
      .mockImplementation(() => "send");

    const rxWS = new RxWebSocket("http://link-url.com");
    expect(rxWS.connect().toPromise()).toBeTruthy();
    rxWS.sendData("data");
    expect(webSocketSendMock).toHaveBeenCalledWith("data");
  });

  test("@connectionState$ & @incomingData$", () => {
    const rxWS = new RxWebSocket("http://link-url.com");
    expect(rxWS.connect().toPromise()).toBeTruthy();
    expect(rxWS.connectionState$).toBeInstanceOf(Observable);
    expect(rxWS.incomingData$).toBeInstanceOf(Observable);
  });

  test("@incomingJSONData$", () => {
    const rxWS = new RxWebSocket("http://link-url.com");
    expect(rxWS.connect().toPromise()).toBeTruthy();
    expect(rxWS.incomingJSONData$).toBeInstanceOf(Observable);
  });
});

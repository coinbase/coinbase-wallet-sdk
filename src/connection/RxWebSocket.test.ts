import { Observable } from "rxjs";
import { EventEmitter } from "stream";

import { RxWebSocket } from "./RxWebSocket";

const mockSend = jest.fn;

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
    // @ts-expect-error mock WebSocket
    window.WebSocket = MockWebSocket;

    const rxWS = new RxWebSocket("http://link-url.com");
    const rxWsRes = await rxWS.connect();

    expect(rxWsRes).toBeInstanceOf(Observable);
    expect(rxWsRes.toPromise()).toBeTruthy();

    // @ts-expect-error test private methods
    expect(rxWS.webSocket).toBeInstanceOf(MockWebSocket);

    await rxWS.disconnect();
    // @ts-expect-error test private methods
    expect(rxWS.webSocket).toBe(null);
  });

  test("sendData", async () => {
    // @ts-expect-error mock WebSocket
    window.WebSocket = MockWebSocket;

    const rxWS = new RxWebSocket("http://link-url.com");
    const rxWsRes = await rxWS.connect();
    expect(rxWsRes.toPromise()).toBeTruthy();
    expect(rxWS.sendData("data")).toEqual("");
  });
});

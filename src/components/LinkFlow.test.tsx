import { Observable } from "rxjs";

import { LinkFlow } from "./LinkFlow";

// @ts-expect-error I do what I want
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => ({
      result: {
        desktop: {
          extension_ui: true,
        },
      },
    }),
  }),
);

describe("LinkFlow", () => {
  const linkFlow = new LinkFlow({
    darkMode: false,
    version: "1.2.1",
    sessionId: "session123",
    sessionSecret: "sessionSecret",
    linkAPIUrl: "http://link-url.com",
    isParentConnection: false,
    connected$: new Observable(),
  });

  test("initialize", () => {
    expect(linkFlow).toMatchObject({
      connectDisabled: false,
      darkMode: false,
      isConnected: false,
      isOpen: false,
      isParentConnection: false,
      linkAPIUrl: "http://link-url.com",
      onCancel: null,
      root: null,
      sessionId: "session123",
      sessionSecret: "sessionSecret",
      version: "1.2.1",
    });
  });

  describe("public methods", () => {
    const attachedEl = document.getElementsByClassName(
      "-cbwsdk-link-flow-root",
    );

    beforeEach(async () => {
      const el = document.createElement("div");
      await linkFlow.attach(el);
    });

    test("@attach", () => {
      expect(attachedEl).toBeTruthy();
    });

    test("@detach", async () => {
      await linkFlow.detach();

      expect(attachedEl.length).toEqual(0);
    });

    test("@setConnectDisabled", () => {
      linkFlow.setConnectDisabled(true);

      expect(linkFlow).toMatchObject({
        connectDisabled: true,
      });
    });

    test("@open", () => {
      linkFlow.open({
        onCancel: () => {},
      });

      expect(linkFlow).toMatchObject({
        isOpen: true,
      });
    });

    test("@close", () => {
      linkFlow.close();

      expect(linkFlow).toMatchObject({
        isOpen: false,
        onCancel: null,
      });
    });
  });
});

import { render } from "@testing-library/preact";
import { h } from "preact";
import { Observable, Subject } from "rxjs";

import { LinkFlow } from "./LinkFlow";

describe("LinkFlow", () => {
  const linkFlow = new LinkFlow({
    darkMode: false,
    version: "1.2.1",
    sessionId: "session123",
    sessionSecret: "sessionSecret",
    linkAPIUrl: "http://link-url.com",
    isParentConnection: false,
    connected$: new Observable(),
    chainId$: new Subject(),
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

  const attachedEl = document.getElementsByClassName("-cbwsdk-link-flow-root");

  describe("public methods", () => {
    beforeEach(() => {
      render(<div id="attach-here" />);
      const ele = document.getElementById("attach-here");
      if (ele) {
        linkFlow.attach(ele);
      }
    });

    test("@attach", () => {
      expect(attachedEl.length).toEqual(1);
    });

    test("@detach", () => {
      linkFlow.detach();

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

  describe("without root element", () => {
    test("@detach", () => {
      const linkFlow1 = new LinkFlow({
        darkMode: true,
        version: "1.2.1",
        sessionId: "session123",
        sessionSecret: "sessionSecret",
        linkAPIUrl: "http://link-url.com",
        isParentConnection: false,
        connected$: new Observable(),
        chainId$: new Subject(),
      });
      linkFlow1.detach();

      expect(attachedEl.length).toEqual(0);
    });
  });
});

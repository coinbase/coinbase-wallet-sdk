import "@testing-library/jest-dom";

import { Crypto } from "@peculiar/webcrypto";
import { TextDecoder, TextEncoder } from "util";

global.crypto = new Crypto();

global.TextEncoder = TextEncoder;

// @ts-expect-error Use util TextDecoder
global.TextDecoder = TextDecoder;

expect.extend({
  toThrowEIPError(received, code, message) {
    expect(received).not.toBeInstanceOf(Error);
    expect(received).toMatchObject({ code, message });
    return {
      pass: !this.isNot,
      message: () =>
        `Expected: ${this.utils.printExpected({
          code,
          message,
        })}\nReceived: ${this.utils.printReceived(received)}`,
    };
  },
});

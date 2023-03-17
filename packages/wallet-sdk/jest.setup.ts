import "@testing-library/jest-dom";

import { Crypto } from "@peculiar/webcrypto";
import { TextDecoder, TextEncoder } from "util";

global.crypto = new Crypto();

global.TextEncoder = TextEncoder;

// @ts-expect-error Use util TextDecoder
global.TextDecoder = TextDecoder;

expect.extend({
  toThrowEIPError(received, code, message) {
    return {
      pass: this.equals(received, expect.objectContaining({ code, message })),
      message: () =>
        `Expected: ${this.utils.printExpected({
          code,
          message,
        })}\nReceived: ${this.utils.printReceived({
          code: received.code,
          message: received.message,
        })}`,
    };
  },
});

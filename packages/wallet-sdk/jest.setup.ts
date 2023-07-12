import '@testing-library/jest-dom';

import { Crypto } from '@peculiar/webcrypto';
import { TextDecoder, TextEncoder } from 'util';

global.crypto = new Crypto();

global.TextEncoder = TextEncoder;

// @ts-expect-error Use util TextDecoder
global.TextDecoder = TextDecoder;

expect.extend({
  toThrowEIPError(received, code, message) {
    const expected = expect.objectContaining({
      code,
      message,
      docUrl: expect.stringMatching(
        /^https:\/\/.*coinbase\.com\/.*version=\d+\.\d+\.\d+.*code=-?\d+.*$/
      ),
    });
    return {
      pass: this.equals(received, expected),
      message: () =>
        this.utils.printDiffOrStringify(expected, received, 'Expected', 'Received', true),
    };
  },
});

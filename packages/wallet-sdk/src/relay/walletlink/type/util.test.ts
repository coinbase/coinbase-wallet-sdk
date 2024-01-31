import BN from 'bn.js';

import {
  bigIntStringFromBN,
  hexStringFromBuffer,
  hexStringToUint8Array,
  randomBytesHex,
  uint8ArrayToHex,
} from './util';

const uint8ArrVal = new Uint8Array(6);

describe('util', () => {
  test('randomBytesHex', () => {
    expect(randomBytesHex(8)).toHaveLength(16);
    expect(randomBytesHex(8)).not.toEqual(randomBytesHex(8));
    expect(randomBytesHex(32)).not.toEqual(randomBytesHex(32));
  });

  test('uint8ArrayToHex', () => {
    expect(uint8ArrayToHex(uint8ArrVal)).toEqual('000000000000');
  });

  test('hexStringToUint8Array', () => {
    expect(hexStringToUint8Array('9298119f5025')).toEqual(
      new Uint8Array([146, 152, 17, 159, 80, 37])
    );
  });

  test('hexStringFromBuffer', () => {
    expect(hexStringFromBuffer(Buffer.alloc(3))).toEqual('000000');
    expect(hexStringFromBuffer(Buffer.alloc(3), true)).toEqual('0x000000');
  });

  test('bigIntStringFromBN', () => {
    expect(
      bigIntStringFromBN(new BN(0b11111111111111111111111111111111111111111111111111111))
    ).toEqual('9007199254740991');
  });
});

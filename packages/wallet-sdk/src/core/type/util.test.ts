import { HexString } from './index.js';
import {
  bigIntStringFromBigInt,
  encodeToHexString,
  ensureAddressString,
  ensureBigInt,
  ensureBuffer,
  ensureEvenLengthHexString,
  ensureHexString,
  ensureIntNumber,
  ensureParsedJSONObject,
  ensureRegExpString,
  getFavicon,
  has0xPrefix,
  hexStringFromBuffer,
  hexStringFromNumber,
  hexStringToUint8Array,
  intNumberFromHexString,
  isHexString,
  prepend0x,
  randomBytesHex,
  range,
  strip0x,
  uint8ArrayToHex,
} from './util.js';

const uint8ArrVal = new Uint8Array(6);
const hexString = 'E556B9bfEFDd5B190c67b521ED0A7d19Ab89a311';

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

  test('endcodeToHexString', () => {
    expect(encodeToHexString('')).toEqual('0x');
    expect(encodeToHexString('713')).toEqual('0x0713');
    expect(
      encodeToHexString('My name is Giovanni Giorgio, but everybody calls me... Jungho')
    ).toEqual(expect.stringContaining('0x4d79206e'));
  });

  test('bigIntStringFromBigInt', () => {
    expect(
      bigIntStringFromBigInt(BigInt(0b11111111111111111111111111111111111111111111111111111))
    ).toEqual('9007199254740991');
  });

  test('intNumberFromHexString', () => {
    expect(intNumberFromHexString(HexString('0x1fffffffffffff'))).toEqual(9007199254740991);
  });

  test('hexStringFromNumber', () => {
    expect(hexStringFromNumber(1234)).toEqual('0x4d2');
    expect(hexStringFromNumber(112341234234)).toEqual('0x1a280f323a');
  });

  test('has0xPrefix', () => {
    expect(has0xPrefix('91234')).toBeFalsy();
    expect(has0xPrefix('ox91234')).toBeFalsy();
    expect(has0xPrefix('0x91234')).toBeTruthy();
    expect(has0xPrefix('0X91234')).toBeTruthy();
  });

  test('strip0x', () => {
    expect(strip0x('0x91234')).toEqual('91234');
    expect(strip0x('70x91234')).toEqual('70x91234');
  });

  test('prepend0x', () => {
    expect(prepend0x('0X91234')).toEqual('0x91234');
    expect(prepend0x('8181003')).toEqual('0x8181003');
  });

  test('isHexString', () => {
    expect(isHexString(8173290)).toBeFalsy();
    expect(isHexString('8173290')).toBeTruthy();
    expect(isHexString('apple-sauce')).toBeFalsy();
  });

  test('ensureHexString', () => {
    expect(() => ensureHexString(123)).toThrowError('"123" is not a hexadecimal string');
    expect(() => ensureHexString('az123456')).toThrowError();
    expect(ensureHexString('123456')).toEqual('123456');
    expect(ensureHexString('123456', true)).toEqual('0x123456');
  });

  test('ensureEvenLengthHexString', () => {
    expect(ensureEvenLengthHexString('0x1234')).toEqual('1234');
    expect(ensureEvenLengthHexString('123456789')).toEqual('0123456789');
    expect(ensureEvenLengthHexString('123456789', true)).toEqual('0x0123456789');
  });

  test('ensureAddressString', () => {
    expect(() => ensureAddressString(1234)).toThrowError('Invalid Ethereum address');
    expect(() => ensureAddressString('E556B9bfEFDd5B190')).toThrowError('Invalid Ethereum address');

    expect(() => ensureAddressString('E556B9bfEFDd5B190c67b521ED0A7d19Ab89a3111')).toThrowError(
      'Invalid Ethereum address'
    );

    expect(ensureAddressString(hexString)).toEqual('0xe556b9bfefdd5b190c67b521ed0a7d19ab89a311');

    expect(ensureAddressString('0XE556B9bfEFDd5B190c67b521ED0A7d19Ab89a311')).toEqual(
      '0xe556b9bfefdd5b190c67b521ed0a7d19ab89a311'
    );
  });

  test('ensureBuffer', () => {
    const bufferVal = Buffer.from('I AM THE WALRUS');

    expect(ensureBuffer(bufferVal).toString()).toEqual('I AM THE WALRUS');
    expect(ensureBuffer('I am the cheshire cat')).toBeInstanceOf(Buffer);
    expect(ensureBuffer(hexString).buffer).toEqual(
      Uint8Array.from([
        140, 22, 81, 137, 137, 56, 98, 28, 52, 215, 100, 110, 146, 161, 33, 228, 175, 127, 154, 17,
        189, 218, 72, 67, 182, 57, 17, 81, 245, 199, 172, 231,
      ]).buffer
    );

    expect(() => ensureBuffer(new Set([12, 23]))).toThrowError();
  });

  test('ensureIntNumber', () => {
    expect(ensureIntNumber(1234)).toEqual(1234);
    expect(ensureIntNumber('1234')).toEqual(1234);
    expect(ensureIntNumber('E556B9bfEFDd')).toEqual(252160646311901);
    expect(ensureIntNumber('252160646311901')).toEqual(252160646311901);
    expect(() => ensureIntNumber([1, 3, 4])).toThrowError();
    expect(() => ensureIntNumber('hexString')).toThrowError();
  });

  test('ensureRegExpString', () => {
    const HEXADECIMAL_STRING_REGEX = /^[a-f0-9]*$/;
    expect(() => ensureRegExpString('^&1234')).toThrowError();
    expect(ensureRegExpString(HEXADECIMAL_STRING_REGEX)).toEqual('/^[a-f0-9]*$/');
  });

  test('ensureBigInt', () => {
    expect(ensureBigInt(12345678910).toString()).toEqual('12345678910');
    expect(ensureBigInt(BigInt(41234124)).toString()).toEqual('41234124');
    expect(Number(ensureBigInt('12345667'))).toEqual(12345667);
    expect(Number(ensureBigInt('ab12345667'))).toEqual(734744827495);
    expect(() => ensureBigInt('ax123456')).toThrowError();
    expect(() => ensureBigInt(['cat'])).toThrowError();
  });

  test('ensureParsedJSONObject', () => {
    const testObj = {
      a: 1,
      b: 2,
    };
    expect(ensureParsedJSONObject('{"a":1,"b":2}')).toMatchObject(testObj);
    expect(
      ensureParsedJSONObject({
        a: 1,
        b: 2,
      })
    ).toMatchObject(testObj);
  });

  test('range', () => {
    expect(range(1, 5)).toMatchObject([1, 2, 3, 4]);
  });

  describe('getFavicon', () => {
    test('return https', () => {
      document.head.innerHTML = `
      <link rel="shortcut icon" sizes="16x16 24x24" href="https://coinbase.com/favicon.ico">
    `;
      expect(getFavicon()).toEqual('https://coinbase.com/favicon.ico');
    });

    test('return http', () => {
      document.head.innerHTML = `
      <link rel="shortcut icon" sizes="16x16 24x24" href="//coinbase.com/favicon.ico">
    `;
      expect(getFavicon()).toEqual('http://coinbase.com/favicon.ico');
    });

    test('return localhost', () => {
      document.head.innerHTML = `
      <link rel="shortcut icon" sizes="16x16 24x24" href="/favicon.ico">
    `;
      expect(getFavicon()).toEqual('http://localhost:3000/favicon.ico');
    });
  });
});

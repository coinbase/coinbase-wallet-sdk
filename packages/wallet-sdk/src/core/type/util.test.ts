import {
  ensureIntNumber,
  hexStringFromNumber,
  hexStringToUint8Array,
  uint8ArrayToHex,
} from './util.js';

const uint8ArrVal = new Uint8Array(6);

describe('util', () => {
  test('uint8ArrayToHex', () => {
    expect(uint8ArrayToHex(uint8ArrVal)).toEqual('000000000000');
  });

  test('hexStringToUint8Array', () => {
    expect(hexStringToUint8Array('9298119f5025')).toEqual(
      new Uint8Array([146, 152, 17, 159, 80, 37])
    );
  });

  test('hexStringFromNumber', () => {
    expect(hexStringFromNumber(1234)).toEqual('0x4d2');
    expect(hexStringFromNumber(112341234234)).toEqual('0x1a280f323a');
  });

  test('ensureIntNumber', () => {
    expect(ensureIntNumber(1234)).toEqual(1234);
    expect(ensureIntNumber('1234')).toEqual(1234);
    expect(ensureIntNumber('E556B9bfEFDd')).toEqual(252160646311901);
    expect(ensureIntNumber('252160646311901')).toEqual(252160646311901);
    expect(() => ensureIntNumber([1, 3, 4])).toThrowError();
    expect(() => ensureIntNumber('hexString')).toThrowError();
  });
});

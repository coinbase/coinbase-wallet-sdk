// Extracted from https://github.com/ethereumjs/ethereumjs-util and stripped out irrelevant code
// Original code licensed under the Mozilla Public License Version 2.0

/* eslint-disable */
//prettier-ignore
const { keccak_256 } = require('@noble/hashes/sha3')

/**
 * Returns a Uint8Array filled with 0s
 * @method zeros
 * @param {Number} bytes  the number of bytes the buffer should be
 * @return {Uint8Array}
 */
function zeros (bytes) {
  return new Uint8Array(bytes).fill(0)
}

function bitLengthFromBigInt (num) {
  return num.toString(2).length
}

function bufferBEFromBigInt(num, length) {
  let hex = num.toString(16);
  // Ensure the hex string length is even
  if (hex.length % 2 !== 0) hex = '0' + hex;
  // Convert hex string to a byte array
  const byteArray = hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
  // Ensure the byte array is of the specified length
  while (byteArray.length < length) {
    byteArray.unshift(0); // Prepend with zeroes if shorter than required length
  }

  return new Uint8Array(byteArray);
}

function twosFromBigInt(value, width) {
  const isNegative = value < 0n;
  let result;
  if (isNegative) {
    // Prepare a mask for the specified width to perform NOT operation
    const mask = (1n << BigInt(width)) - 1n;
    // Invert bits (using NOT) and add one
    result = (~value & mask) + 1n;
  } else {
    result = value;
  }
  // Ensure the result fits in the specified width
  result &= (1n << BigInt(width)) - 1n;

  return result;
}

/**
 * Left Pads an `Array` or `Uint8Array` with leading zeros till it has `length` bytes.
 * Or it truncates the beginning if it exceeds.
 * @method setLength
 * @param {Uint8Array|Array} msg the value to pad
 * @param {Number} length the number of bytes the output should be
 * @param {Boolean} [right=false] whether to start padding form the left or right
 * @return {Uint8Array|Array}
 */
function setLength (msg, length, right) {
  const buf = zeros(length)
  msg = toBuffer(msg)
  if (right) {
    if (msg.length < length) {
      buf.set(msg)
      return buf
    }
    return msg.slice(0, length)
  } else {
    if (msg.length < length) {
      buf.set(msg, length - msg.length)
      return buf
    }
    return msg.slice(-length)
  }
}

/**
 * Right Pads an `Array` or `Uint8Array` with leading zeros till it has `length` bytes.
 * Or it truncates the beginning if it exceeds.
 * @param {Uint8Array|Array} msg the value to pad
 * @param {Number} length the number of bytes the output should be
 * @return {Uint8Array|Array}
 */
function setLengthRight (msg, length) {
  return setLength(msg, length, true)
}

/**
 * Attempts to turn a value into a `Uint8Array`. As input it supports `Uint8Array`, `String`, `Number`, null/undefined, `BigInt` and other objects with a `toArray()` method.
 * @param {*} v the value
 */
function toBuffer (v) {
  if (!(v instanceof Uint8Array)) {
    if (Array.isArray(v)) {
      v = new Uint8Array(v)
    } else if (typeof v === 'string') {
      if (isHexString(v)) {
        v = new Uint8Array(padToEven(stripHexPrefix(v)).match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
      } else {
        v = new TextEncoder().encode(v)
      }
    } else if (typeof v === 'number') {
      v = new Uint8Array([v])
    } else if (v === null || v === undefined) {
      v = new Uint8Array(0)
    } else if (typeof v === 'bigint') {
      v = bufferBEFromBigInt(v)
    } else if (v.toArray) {
      v = new Uint8Array(v.toArray())
    } else {
      throw new Error('invalid type')
    }
  }
  return v
}

/**
 * Converts a `Uint8Array` into a hex `String`
 * @param {Uint8Array} buf
 * @return {String}
 */
function bufferToHex (buf) {
  buf = toBuffer(buf)
  return '0x' + Array.from(buf).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Creates Keccak hash of the input
 * @param {Uint8Array|Array|String|Number} a the input data
 * @param {Number} [bits=256] the Keccak width
 * @return {Uint8Array}
 */
function keccak (a, bits) {
  a = toBuffer(a)
  if (!bits) bits = 256

  return new Uint8Array(keccak_256(a))
}

function padToEven (str) {
  return str.length % 2 ? '0' + str : str
}

function isHexString (str) {
  return typeof str === 'string' && str.match(/^0x[0-9A-Fa-f]*$/)
}

function stripHexPrefix (str) {
  if (typeof str === 'string' && str.startsWith('0x')) {
    return str.slice(2)
  }
  return str
}

function concatUint8Arrays(arrays) {
  let totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
  let result = new Uint8Array(totalLength);
  let offset = 0;
  for (let array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}

module.exports = {
  zeros,
  setLength,
  setLengthRight,
  isHexString,
  stripHexPrefix,
  toBuffer,
  bufferToHex,
  keccak,
  bitLengthFromBigInt,
  bufferBEFromBigInt,
  twosFromBigInt,
  concatUint8Arrays
}

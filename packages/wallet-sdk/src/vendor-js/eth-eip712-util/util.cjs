// Extracted from https://github.com/ethereumjs/ethereumjs-util and stripped out irrelevant code
// Original code licensed under the Mozilla Public License Version 2.0

/* eslint-disable */
//prettier-ignore
const { keccak_256 } = require('@noble/hashes/sha3')

/**
 * Returns a buffer filled with 0s
 * @method zeros
 * @param {Number} bytes  the number of bytes the buffer should be
 * @return {Buffer}
 */
function zeros (bytes) {
  return Buffer.allocUnsafe(bytes).fill(0)
}


/**
 * Converts a `Number` into a hex `String` (https://github.com/ethjs/ethjs-util/blob/master/src/index.js)
 * @param {Number} i
 * @return {String}
 */
function intToHex(i) {
  const hex = i.toString(16); // eslint-disable-line

  return `0x${hex}`;
}

/**
 * Converts an `Number` to a `Buffer` (https://github.com/ethjs/ethjs-util/blob/master/src/index.js)
 * @param {Number} i
 * @return {Buffer}
 */
function intToBuffer(i) {
  const hex = intToHex(i);

  return new Buffer(padToEven(hex.slice(2)), 'hex');
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

  return Buffer.from(byteArray);
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
 * Left Pads an `Array` or `Buffer` with leading zeros till it has `length` bytes.
 * Or it truncates the beginning if it exceeds.
 * @method setLength
 * @param {Buffer|Array} msg the value to pad
 * @param {Number} length the number of bytes the output should be
 * @param {Boolean} [right=false] whether to start padding form the left or right
 * @return {Buffer|Array}
 */
function setLength (msg, length, right) {
  const buf = zeros(length)
  msg = toBuffer(msg)
  if (right) {
    if (msg.length < length) {
      msg.copy(buf)
      return buf
    }
    return msg.slice(0, length)
  } else {
    if (msg.length < length) {
      msg.copy(buf, length - msg.length)
      return buf
    }
    return msg.slice(-length)
  }
}

/**
 * Right Pads an `Array` or `Buffer` with leading zeros till it has `length` bytes.
 * Or it truncates the beginning if it exceeds.
 * @param {Buffer|Array} msg the value to pad
 * @param {Number} length the number of bytes the output should be
 * @return {Buffer|Array}
 */
function setLengthRight (msg, length) {
  return setLength(msg, length, true)
}

/**
 * Attempts to turn a value into a `Buffer`. As input it supports `Buffer`, `String`, `Number`, null/undefined, `BIgInt` and other objects with a `toArray()` method.
 * @param {*} v the value
 */
function toBuffer (v) {
  if (!Buffer.isBuffer(v)) {
    if (Array.isArray(v)) {
      v = Buffer.from(v)
    } else if (typeof v === 'string') {
      if (isHexString(v)) {
        v = Buffer.from(padToEven(stripHexPrefix(v)), 'hex')
      } else {
        v = Buffer.from(v)
      }
    } else if (typeof v === 'number') {
      v = intToBuffer(v)
    } else if (v === null || v === undefined) {
      v = Buffer.allocUnsafe(0)
    } else if (typeof v === 'bigint') {
      v = bufferBEFromBigInt(v)
    } else if (v.toArray) {
      // TODO: bigint should be handled above, may remove this duplicate
      // converts a BigInt to a Buffer
      v = Buffer.from(v.toArray())
    } else {
      throw new Error('invalid type')
    }
  }
  return v
}

/**
 * Converts a `Buffer` into a hex `String`
 * @param {Buffer} buf
 * @return {String}
 */
function bufferToHex (buf) {
  buf = toBuffer(buf)
  return '0x' + buf.toString('hex')
}

/**
 * Creates Keccak hash of the input
 * @param {Buffer|Array|String|Number} a the input data
 * @param {Number} [bits=256] the Keccak width
 * @return {Buffer}
 */
function keccak (a, bits) {
  a = toBuffer(a)
  if (!bits) bits = 256
  if (bits !== 256) {
    throw new Error('unsupported')
  }
  return Buffer.from(keccak_256(new Uint8Array(a)))
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
  twosFromBigInt
}

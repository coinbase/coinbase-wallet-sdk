/* eslint-disable @typescript-eslint/no-explicit-any */
// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { standardErrors } from '../error/errors.js';
import { Address, BigIntString, HexString, IntNumber, RegExpString } from './index.js';

const INT_STRING_REGEX = /^[0-9]*$/;
const HEXADECIMAL_STRING_REGEX = /^[a-f0-9]*$/;

/**
 * @param length number of bytes
 */
export function randomBytesHex(length: number): string {
  return uint8ArrayToHex(crypto.getRandomValues(new Uint8Array(length)));
}

export function uint8ArrayToHex(value: Uint8Array) {
  return [...value].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexStringToUint8Array(hexString: string): Uint8Array {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)));
}

export function hexStringFromBuffer(buf: Buffer, includePrefix = false): HexString {
  const hex = buf.toString('hex');
  return HexString(includePrefix ? `0x${hex}` : hex);
}

export function encodeToHexString(str: unknown): HexString {
  return hexStringFromBuffer(ensureBuffer(str), true);
}

export function bigIntStringFromBigInt(bi: bigint): BigIntString {
  return BigIntString(bi.toString(10));
}

export function intNumberFromHexString(hex: HexString): IntNumber {
  return IntNumber(Number(BigInt(ensureEvenLengthHexString(hex, true))));
}

export function hexStringFromNumber(num: number): HexString {
  return HexString(`0x${BigInt(num).toString(16)}`);
}

export function has0xPrefix(str: string): boolean {
  return str.startsWith('0x') || str.startsWith('0X');
}

export function strip0x(hex: string): string {
  if (has0xPrefix(hex)) {
    return hex.slice(2);
  }
  return hex;
}

export function prepend0x(hex: string): string {
  if (has0xPrefix(hex)) {
    return `0x${hex.slice(2)}`;
  }
  return `0x${hex}`;
}

export function isHexString(hex: unknown): hex is HexString {
  if (typeof hex !== 'string') {
    return false;
  }
  const s = strip0x(hex).toLowerCase();
  return HEXADECIMAL_STRING_REGEX.test(s);
}

export function ensureHexString(hex: unknown, includePrefix = false): HexString {
  if (typeof hex === 'string') {
    const s = strip0x(hex).toLowerCase();
    if (HEXADECIMAL_STRING_REGEX.test(s)) {
      return HexString(includePrefix ? `0x${s}` : s);
    }
  }
  throw standardErrors.rpc.invalidParams(`"${String(hex)}" is not a hexadecimal string`);
}

export function ensureEvenLengthHexString(hex: unknown, includePrefix = false): HexString {
  let h = ensureHexString(hex, false);
  if (h.length % 2 === 1) {
    h = HexString(`0${h}`);
  }
  return includePrefix ? HexString(`0x${h}`) : h;
}

export function ensureAddressString(str: unknown): Address {
  if (typeof str === 'string') {
    const s = strip0x(str).toLowerCase();
    if (isHexString(s) && s.length === 40) {
      return prepend0x(s) as Address;
    }
  }
  throw standardErrors.rpc.invalidParams(`Invalid Ethereum address: ${String(str)}`);
}

export function ensureBuffer(str: unknown): Buffer {
  if (Buffer.isBuffer(str)) {
    return str;
  }
  if (typeof str === 'string') {
    if (isHexString(str)) {
      const s = ensureEvenLengthHexString(str, false);
      return Buffer.from(s, 'hex');
    }
    return Buffer.from(str, 'utf8');
  }
  throw standardErrors.rpc.invalidParams(`Not binary data: ${String(str)}`);
}

export function ensureIntNumber(num: unknown): IntNumber {
  if (typeof num === 'number' && Number.isInteger(num)) {
    return IntNumber(num);
  }
  if (typeof num === 'string') {
    if (INT_STRING_REGEX.test(num)) {
      return IntNumber(Number(num));
    }
    if (isHexString(num)) {
      return IntNumber(Number(BigInt(ensureEvenLengthHexString(num, true))));
    }
  }
  throw standardErrors.rpc.invalidParams(`Not an integer: ${String(num)}`);
}

export function ensureRegExpString(regExp: unknown): RegExpString {
  if (regExp instanceof RegExp) {
    return RegExpString(regExp.toString());
  }
  throw standardErrors.rpc.invalidParams(`Not a RegExp: ${String(regExp)}`);
}

export function ensureBigInt(val: unknown): bigint {
  if (val !== null && (typeof val === 'bigint' || isBigNumber(val))) {
    return BigInt((val as any).toString(10));
  }
  if (typeof val === 'number') {
    return BigInt(ensureIntNumber(val));
  }
  if (typeof val === 'string') {
    if (INT_STRING_REGEX.test(val)) {
      return BigInt(val);
    }
    if (isHexString(val)) {
      return BigInt(ensureEvenLengthHexString(val, true));
    }
  }
  throw standardErrors.rpc.invalidParams(`Not an integer: ${String(val)}`);
}

export function ensureParsedJSONObject<T extends object>(val: unknown): T {
  if (typeof val === 'string') {
    return JSON.parse(val) as T;
  }

  if (typeof val === 'object') {
    return val as T;
  }

  throw standardErrors.rpc.invalidParams(`Not a JSON string or an object: ${String(val)}`);
}

export function isBigNumber(val: unknown): boolean {
  if (val == null || typeof (val as any).constructor !== 'function') {
    return false;
  }
  const { constructor } = val as any;
  return typeof constructor.config === 'function' && typeof constructor.EUCLID === 'number';
}

export function range(start: number, stop: number): number[] {
  return Array.from({ length: stop - start }, (_, i) => start + i);
}

export function getFavicon(): string | null {
  const el =
    document.querySelector('link[sizes="192x192"]') ||
    document.querySelector('link[sizes="180x180"]') ||
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]');

  const { protocol, host } = document.location;
  const href = el ? el.getAttribute('href') : null;
  if (!href || href.startsWith('javascript:') || href.startsWith('vbscript:')) {
    return `${protocol}//${host}/favicon.ico`; // fallback
  }
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('data:')) {
    return href;
  }
  if (href.startsWith('//')) {
    return protocol + href;
  }
  return `${protocol}//${host}${href}`;
}

export function areAddressArraysEqual(arr1: Address[], arr2: Address[]): boolean {
  return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}

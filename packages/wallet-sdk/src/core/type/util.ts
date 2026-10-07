// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { standardErrors } from '../error/errors.js';
import { HexString, IntNumber } from './index.js';

const INT_STRING_REGEX = /^[0-9]*$/;
const HEXADECIMAL_STRING_REGEX = /^[a-f0-9]*$/;

export function uint8ArrayToHex(value: Uint8Array) {
  return [...value].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexStringToUint8Array(hexString: string): Uint8Array {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)));
}

export function hexStringFromNumber(num: number): HexString {
  return HexString(`0x${BigInt(num).toString(16)}`);
}

function has0xPrefix(str: string): boolean {
  return str.startsWith('0x') || str.startsWith('0X');
}

function strip0x(hex: string): string {
  if (has0xPrefix(hex)) {
    return hex.slice(2);
  }
  return hex;
}

function isHexString(hex: unknown): hex is HexString {
  if (typeof hex !== 'string') {
    return false;
  }
  const s = strip0x(hex).toLowerCase();
  return HEXADECIMAL_STRING_REGEX.test(s);
}

function ensureHexString(hex: unknown, includePrefix = false): HexString {
  if (typeof hex === 'string') {
    const s = strip0x(hex).toLowerCase();
    if (HEXADECIMAL_STRING_REGEX.test(s)) {
      return HexString(includePrefix ? `0x${s}` : s);
    }
  }
  throw standardErrors.rpc.invalidParams(`"${String(hex)}" is not a hexadecimal string`);
}

function ensureEvenLengthHexString(hex: unknown, includePrefix = false): HexString {
  let h = ensureHexString(hex, false);
  if (h.length % 2 === 1) {
    h = HexString(`0${h}`);
  }
  return includePrefix ? HexString(`0x${h}`) : h;
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

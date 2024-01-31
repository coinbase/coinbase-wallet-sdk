// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import BN from 'bn.js';

import { BigIntString, HexString } from '../../../core/type';

export function randomBytesHex(length: number): string {
  return uint8ArrayToHex(crypto.getRandomValues(new Uint8Array(length)));
}

export function uint8ArrayToHex(value: Uint8Array) {
  return [...value].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexStringToUint8Array(hexString: string): Uint8Array {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
}

export function hexStringFromBuffer(buf: Buffer, includePrefix = false): HexString {
  const hex = buf.toString('hex');
  return HexString(includePrefix ? `0x${hex}` : hex);
}

export function bigIntStringFromBN(bn: BN): BigIntString {
  return BigIntString(bn.toString(10));
}

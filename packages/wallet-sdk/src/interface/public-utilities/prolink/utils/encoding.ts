// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

import { Bytes, Hex } from 'ox';

/**
 * Field encoding helpers for canonical encoding
 */

/**
 * Encode an Ethereum address to 20 bytes
 * @param address - Hex address string (with or without 0x prefix)
 * @returns 20-byte address
 * @throws Error if address is not 20 bytes
 */
export function encodeAddress(address: string): Uint8Array {
  // Normalize to ensure 0x prefix
  const normalized = address.startsWith('0x') ? address : `0x${address}`;

  // Validate length (0x + 40 hex chars)
  if (normalized.length !== 42) {
    throw new Error(`Invalid address length: expected 40 hex chars, got ${normalized.length - 2}`);
  }

  const bytes = Bytes.fromHex(normalized as Hex.Hex);

  if (bytes.length !== 20) {
    throw new Error(`Invalid address length: expected 20 bytes, got ${bytes.length}`);
  }

  return bytes;
}

/**
 * Decode 20-byte address to hex string
 * @param bytes - 20-byte address
 * @returns Hex address string with 0x prefix
 */
export function decodeAddress(bytes: Uint8Array): string {
  if (bytes.length !== 20) {
    throw new Error(`Invalid address length: expected 20 bytes, got ${bytes.length}`);
  }

  return Hex.fromBytes(bytes);
}

/**
 * Encode an amount to minimal big-endian bytes (no leading zeros)
 * @param value - Amount as bigint or hex string
 * @returns Minimal big-endian bytes
 */
export function encodeAmount(value: bigint | string): Uint8Array {
  let bigintValue: bigint;

  if (typeof value === 'string') {
    // Handle hex strings
    const normalized = value.toLowerCase().replace(/^0x/, '');
    if (normalized === '' || normalized === '0') {
      return new Uint8Array([0x00]);
    }
    bigintValue = BigInt(`0x${normalized}`);
  } else {
    bigintValue = value;
  }

  // Handle zero
  if (bigintValue === 0n) {
    return new Uint8Array([0x00]);
  }

  // Handle negative (not allowed)
  if (bigintValue < 0n) {
    throw new Error('Cannot encode negative amounts');
  }

  // Convert to minimal big-endian bytes using Ox
  const hex = bigintValue.toString(16);
  // Pad to even length if needed (for proper byte conversion)
  const paddedHex = hex.length % 2 === 0 ? hex : `0${hex}`;
  return Bytes.fromHex(`0x${paddedHex}` as Hex.Hex);
}

/**
 * Decode minimal big-endian bytes to bigint
 * @param bytes - Minimal big-endian bytes (or empty for zero)
 * @returns Amount as bigint
 */
export function decodeAmount(bytes: Uint8Array): bigint {
  if (bytes.length === 0) {
    return 0n;
  }

  // Validate no leading zeros (except for single 0x00)
  if (bytes.length > 1 && bytes[0] === 0) {
    throw new Error('Invalid amount encoding: leading zeros not allowed');
  }

  const hex = Hex.fromBytes(bytes);
  return BigInt(hex);
}

/**
 * Encode capabilities map to protobuf format
 * @param caps - Capabilities object
 * @returns Map with UTF-8 JSON-encoded values
 */
export function encodeCapabilities(caps: Record<string, unknown>): Map<string, Uint8Array> {
  const map = new Map<string, Uint8Array>();

  for (const [key, value] of Object.entries(caps)) {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    map.set(key, bytes);
  }

  return map;
}

/**
 * Decode capabilities map from protobuf format
 * @param map - Map with UTF-8 JSON-encoded values
 * @returns Capabilities object
 */
export function decodeCapabilities(map: Map<string, Uint8Array>): Record<string, unknown> {
  const caps: Record<string, unknown> = {};

  for (const [key, bytes] of map.entries()) {
    try {
      const json = new TextDecoder().decode(bytes);
      caps[key] = JSON.parse(json);
    } catch (error) {
      throw new Error(
        `Failed to decode capability '${key}': ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  return caps;
}

/**
 * Pad a value to 32 bytes (for EIP-712 encoding)
 * @param bytes - Value to pad
 * @returns 32-byte padded value
 */
export function pad32(bytes: Uint8Array): Uint8Array {
  if (bytes.length > 32) {
    throw new Error(`Cannot pad value larger than 32 bytes: ${bytes.length}`);
  }

  const padded = new Uint8Array(32);
  // Left-pad with zeros
  padded.set(bytes, 32 - bytes.length);
  return padded;
}

/**
 * Convert bytes to hex string with 0x prefix
 * Minimal encoding: no leading zeros unless value is zero
 * @param bytes - Bytes to convert
 * @returns Hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return '0x0';
  }

  // For single byte 0, return 0x0
  if (bytes.length === 1 && bytes[0] === 0) {
    return '0x0';
  }

  // Use Ox to convert bytes to hex
  const fullHex = Hex.fromBytes(bytes);

  // Strip leading zeros for minimal encoding
  // Keep at least one character (for 0x0)
  let hex = fullHex.replace(/^0x0+/, '0x') || '0x0';

  // Ensure we don't end up with just '0x'
  if (hex === '0x') {
    hex = '0x0';
  }

  return hex;
}

/**
 * Convert hex string to bytes
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  // Normalize to ensure 0x prefix
  const normalized = hex.startsWith('0x') ? hex : `0x${hex}`;

  // Use Ox's Bytes.fromHex which properly handles odd-length hex strings
  return Bytes.fromHex(normalized as Hex.Hex);
}

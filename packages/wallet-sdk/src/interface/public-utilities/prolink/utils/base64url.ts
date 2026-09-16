// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

/**
 * Base64url encoding/decoding utilities
 * RFC 4648 compliant
 */

const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Encode a Uint8Array to Base64url without padding
 * @param data - Data to encode
 * @returns Base64url encoded string without padding
 */
export function encodeBase64url(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  const base64 = btoa(binary);

  // Convert base64 to base64url (replace + with -, / with _)
  // Remove padding (=)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a Base64url string to Uint8Array
 * Accepts strings with or without padding
 * @param payload - Base64url encoded string
 * @returns Decoded Uint8Array
 * @throws Error if payload contains invalid characters
 */
export function decodeBase64url(payload: string): Uint8Array {
  // Validate characters
  for (let i = 0; i < payload.length; i++) {
    const char = payload[i];
    if (!BASE64URL_ALPHABET.includes(char) && char !== '=') {
      throw new Error(
        `Invalid Base64url character at position ${i}: '${char}'. Only A-Z, a-z, 0-9, -, _ are allowed.`
      );
    }
  }

  // Validate padding (must be at end only)
  const paddingIndex = payload.indexOf('=');
  if (paddingIndex !== -1) {
    const paddingPart = payload.slice(paddingIndex);
    if (paddingPart !== '=' && paddingPart !== '==') {
      throw new Error('Invalid Base64url padding');
    }
    // Ensure no non-padding characters after padding
    for (let i = paddingIndex; i < payload.length; i++) {
      if (payload[i] !== '=') {
        throw new Error('Invalid Base64url: characters found after padding');
      }
    }
  }

  // Convert base64url to standard base64
  let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed (base64 requires padding for decoding)
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(paddingNeeded);

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    throw new Error(
      `Failed to decode Base64url: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

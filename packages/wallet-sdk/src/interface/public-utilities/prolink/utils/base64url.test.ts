// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

import { describe, expect, it } from 'vitest';
import { decodeBase64url, encodeBase64url } from './base64url.js';

describe('base64url (EIP-8050 RFC 4648 Compliance)', () => {
  describe('encodeBase64url', () => {
    it('should encode empty array', () => {
      const result = encodeBase64url(new Uint8Array([]));
      expect(result).toBe('');
    });

    it('should encode single byte', () => {
      const result = encodeBase64url(new Uint8Array([0x00]));
      expect(result).toBe('AA');
    });

    it('should encode without padding', () => {
      const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const result = encodeBase64url(data);
      expect(result).not.toContain('=');
      expect(result).toBe('SGVsbG8');
    });

    it('should use URL-safe characters', () => {
      // This input would produce + and / in standard base64
      const data = new Uint8Array([0xfb, 0xff, 0xfe]);
      const result = encodeBase64url(data);
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).toBe('-__-'); // + becomes -, / becomes _
    });

    it('should roundtrip correctly', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const encoded = encodeBase64url(data);
      const decoded = decodeBase64url(encoded);
      expect(decoded).toEqual(data);
    });
  });

  describe('decodeBase64url', () => {
    it('should decode empty string', () => {
      const result = decodeBase64url('');
      expect(result).toEqual(new Uint8Array([]));
    });

    it('should decode without padding', () => {
      const result = decodeBase64url('SGVsbG8');
      expect(result).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });

    it('should decode with padding', () => {
      const result = decodeBase64url('SGVsbG8=');
      expect(result).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });

    it('should decode URL-safe characters', () => {
      const result = decodeBase64url('-__-');
      expect(result).toEqual(new Uint8Array([0xfb, 0xff, 0xfe]));
    });

    it('should throw on invalid characters', () => {
      expect(() => decodeBase64url('ABC@DEF')).toThrow(/Invalid Base64url character/);
      expect(() => decodeBase64url('ABC DEF')).toThrow(/Invalid Base64url character/);
      expect(() => decodeBase64url('ABC+DEF')).toThrow(/Invalid Base64url character/);
    });

    it('should throw on invalid padding', () => {
      expect(() => decodeBase64url('ABC=DEF')).toThrow(/Invalid Base64url/);
      expect(() => decodeBase64url('ABCD===')).toThrow(/Invalid Base64url padding/);
    });

    it('should handle long strings', () => {
      const data = new Uint8Array(1000).map((_, i) => i % 256);
      const encoded = encodeBase64url(data);
      const decoded = decodeBase64url(encoded);
      expect(decoded).toEqual(data);
    });
  });

  describe('EIP-8050 specific requirements', () => {
    // Per spec: "Encoders MUST NOT include Base64url padding (=)"
    // Per spec: "Decoders MUST accept payloads with or without padding"

    it('should encode without padding characters', () => {
      // Test various lengths that would require 1 or 2 padding chars in standard base64
      const data1 = new Uint8Array([1]); // Would need == padding
      const data2 = new Uint8Array([1, 2]); // Would need = padding
      const data3 = new Uint8Array([1, 2, 3]); // No padding needed

      expect(encodeBase64url(data1)).not.toContain('=');
      expect(encodeBase64url(data2)).not.toContain('=');
      expect(encodeBase64url(data3)).not.toContain('=');
    });

    it('should decode with single padding', () => {
      // "SGVsbA==" in standard base64 is "Hell" (4 chars)
      // As base64url without padding: "SGVsbA"
      // With padding: "SGVsbA=="
      const withPadding = 'SGVsbA==';
      const decoded = decodeBase64url(withPadding);
      expect(new TextDecoder().decode(decoded)).toBe('Hell');
    });

    it('should decode without padding', () => {
      const withoutPadding = 'SGVsbA';
      const decoded = decodeBase64url(withoutPadding);
      expect(new TextDecoder().decode(decoded)).toBe('Hell');
    });

    // Per spec: "Decoders MUST reject characters outside the Base64url alphabet"
    describe('character validation', () => {
      it('should reject + character (standard base64)', () => {
        expect(() => decodeBase64url('ABC+DEF')).toThrow(/Invalid Base64url character/);
      });

      it('should reject / character (standard base64)', () => {
        expect(() => decodeBase64url('ABC/DEF')).toThrow(/Invalid Base64url character/);
      });

      it('should reject space character', () => {
        expect(() => decodeBase64url('ABC DEF')).toThrow(/Invalid Base64url character/);
      });

      it('should reject newline character', () => {
        expect(() => decodeBase64url('ABC\nDEF')).toThrow(/Invalid Base64url character/);
      });

      it('should reject special characters', () => {
        expect(() => decodeBase64url('ABC@DEF')).toThrow(/Invalid Base64url character/);
        expect(() => decodeBase64url('ABC#DEF')).toThrow(/Invalid Base64url character/);
        expect(() => decodeBase64url('ABC$DEF')).toThrow(/Invalid Base64url character/);
      });

      it('should accept all valid Base64url characters', () => {
        // Valid alphabet: A-Z, a-z, 0-9, -, _
        const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        // This should decode without error (though the result may not be meaningful)
        expect(() => decodeBase64url(validChars)).not.toThrow();
      });
    });

    // Per spec: "Invalid padding (padding characters not at the end, or incorrect padding length)"
    describe('padding validation', () => {
      it('should reject padding in the middle', () => {
        expect(() => decodeBase64url('ABC=DEF')).toThrow(/Invalid Base64url/);
      });

      it('should reject more than 2 padding characters', () => {
        expect(() => decodeBase64url('ABCD===')).toThrow(/Invalid Base64url padding/);
      });

      it('should accept valid single padding', () => {
        expect(() => decodeBase64url('SGVsbG8=')).not.toThrow();
      });

      it('should accept valid double padding', () => {
        // "QQ==" is valid: 1 byte ('A') needs 2 base64 chars + == padding
        expect(() => decodeBase64url('QQ==')).not.toThrow();
        expect(decodeBase64url('QQ==')).toEqual(new Uint8Array([0x41])); // 'A'
      });
    });
  });

  describe('URL-safe character substitution', () => {
    // Per spec: Base64url uses - instead of + and _ instead of /

    it('should use - instead of + in encoding', () => {
      // Find a byte sequence that would produce + in standard base64
      // 0xfb in base64 produces '+'
      const data = new Uint8Array([0xfb]);
      const encoded = encodeBase64url(data);
      expect(encoded).toContain('-');
      expect(encoded).not.toContain('+');
    });

    it('should use _ instead of / in encoding', () => {
      // 0xff in base64 produces '/'
      const data = new Uint8Array([0xff]);
      const encoded = encodeBase64url(data);
      expect(encoded).toContain('_');
      expect(encoded).not.toContain('/');
    });

    it('should decode - as + equivalent', () => {
      // -__- in base64url = +//+ in standard base64
      const result = decodeBase64url('-__-');
      expect(result).toEqual(new Uint8Array([0xfb, 0xff, 0xfe]));
    });
  });

  describe('roundtrip with typical prolink payloads', () => {
    it('should roundtrip protobuf-like binary data', () => {
      // Simulating a small protobuf payload
      const protoData = new Uint8Array([
        0x08,
        0x01, // field 1 = 1
        0x10,
        0xa5,
        0x42, // field 2 = 8453
        0x18,
        0x01, // field 3 = 1
      ]);

      const encoded = encodeBase64url(protoData);
      const decoded = decodeBase64url(encoded);
      expect(decoded).toEqual(protoData);
    });

    it('should roundtrip compressed data', () => {
      // Brotli compressed data often contains bytes that would be + or / in base64
      const compressedData = new Uint8Array([
        0x01, // compression flag
        0x8b,
        0x05,
        0x80,
        0x08,
        0x01,
        0x10,
        0xa5,
        0x42, // brotli data
      ]);

      const encoded = encodeBase64url(compressedData);
      const decoded = decodeBase64url(encoded);
      expect(decoded).toEqual(compressedData);
    });
  });
});

// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

import { describe, expect, it } from 'vitest';
import {
  bytesToHex,
  decodeAddress,
  decodeAmount,
  decodeCapabilities,
  encodeAddress,
  encodeAmount,
  encodeCapabilities,
  hexToBytes,
  pad32,
} from './encoding.js';

describe('encoding', () => {
  describe('encodeAddress / decodeAddress', () => {
    it('should encode and decode address', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const encoded = encodeAddress(address);
      expect(encoded.length).toBe(20);
      const decoded = decodeAddress(encoded);
      expect(decoded).toBe(address);
    });

    it('should normalize address to lowercase', () => {
      const address = '0xABCDEF1234567890123456789012345678901234';
      const encoded = encodeAddress(address);
      const decoded = decodeAddress(encoded);
      expect(decoded).toBe(address.toLowerCase());
    });

    it('should handle address without 0x prefix', () => {
      const address = '1234567890123456789012345678901234567890';
      const encoded = encodeAddress(address);
      expect(encoded.length).toBe(20);
    });

    it('should throw on invalid address length', () => {
      expect(() => encodeAddress('0x1234')).toThrow(/Invalid address length/);
      expect(() => decodeAddress(new Uint8Array(10))).toThrow(/Invalid address length/);
    });
  });

  describe('encodeAmount / decodeAmount', () => {
    it('should encode zero', () => {
      const encoded = encodeAmount(0n);
      expect(encoded).toEqual(new Uint8Array([0x00]));
      expect(decodeAmount(encoded)).toBe(0n);
    });

    it('should encode zero from string', () => {
      const encoded = encodeAmount('0x0');
      expect(encoded).toEqual(new Uint8Array([0x00]));
    });

    it('should decode empty bytes as zero', () => {
      const decoded = decodeAmount(new Uint8Array([]));
      expect(decoded).toBe(0n);
    });

    it('should encode small amounts minimally', () => {
      const encoded = encodeAmount(255n);
      expect(encoded).toEqual(new Uint8Array([0xff]));
      expect(decodeAmount(encoded)).toBe(255n);
    });

    it('should encode large amounts minimally', () => {
      const encoded = encodeAmount(5000000n); // 0x4c4b40
      expect(encoded).toEqual(new Uint8Array([0x4c, 0x4b, 0x40]));
      expect(decodeAmount(encoded)).toBe(5000000n);
    });

    it('should encode from hex string', () => {
      const encoded = encodeAmount('0x4c4b40');
      expect(encoded).toEqual(new Uint8Array([0x4c, 0x4b, 0x40]));
      expect(decodeAmount(encoded)).toBe(5000000n);
    });

    it('should reject leading zeros in decoding', () => {
      const invalidEncoding = new Uint8Array([0x00, 0x01]);
      expect(() => decodeAmount(invalidEncoding)).toThrow(/leading zeros/);
    });

    it('should reject negative amounts', () => {
      expect(() => encodeAmount(-1n)).toThrow(/negative/);
    });

    it('should handle 1 ETH (18 decimals)', () => {
      const oneEth = 10n ** 18n; // 0xde0b6b3a7640000
      const encoded = encodeAmount(oneEth);
      expect(encoded).toEqual(new Uint8Array([0x0d, 0xe0, 0xb6, 0xb3, 0xa7, 0x64, 0x00, 0x00]));
      expect(decodeAmount(encoded)).toBe(oneEth);
    });
  });

  describe('encodeCapabilities / decodeCapabilities', () => {
    it('should encode empty capabilities', () => {
      const encoded = encodeCapabilities({});
      expect(encoded.size).toBe(0);
    });

    it('should encode string capability', () => {
      const caps = { orderId: 'ORDER-123' };
      const encoded = encodeCapabilities(caps);
      expect(encoded.size).toBe(1);
      const decoded = decodeCapabilities(encoded);
      expect(decoded).toEqual(caps);
    });

    it('should encode object capability', () => {
      const caps = {
        dataCallback: {
          callbackURL: 'https://example.com',
          events: ['initiated'],
        },
      };
      const encoded = encodeCapabilities(caps);
      const decoded = decodeCapabilities(encoded);
      expect(decoded).toEqual(caps);
    });

    it('should encode multiple capabilities', () => {
      const caps = {
        order_id: 'ORDER-123',
        tip_bps: 50,
        dataCallback: { callbackURL: 'https://example.com' },
      };
      const encoded = encodeCapabilities(caps);
      const decoded = decodeCapabilities(encoded);
      expect(decoded).toEqual(caps);
    });

    it('should throw on invalid JSON in decode', () => {
      const invalidMap = new Map<string, Uint8Array>();
      invalidMap.set('test', new Uint8Array([0xff, 0xfe])); // Invalid UTF-8
      expect(() => decodeCapabilities(invalidMap)).toThrow();
    });
  });

  describe('pad32', () => {
    it('should pad address to 32 bytes', () => {
      const address = new Uint8Array(20).fill(0x42);
      const padded = pad32(address);
      expect(padded.length).toBe(32);
      expect(padded.slice(0, 12)).toEqual(new Uint8Array(12).fill(0));
      expect(padded.slice(12)).toEqual(address);
    });

    it('should pad amount to 32 bytes', () => {
      const amount = new Uint8Array([0x01, 0x02, 0x03]);
      const padded = pad32(amount);
      expect(padded.length).toBe(32);
      expect(padded[29]).toBe(0x01);
      expect(padded[30]).toBe(0x02);
      expect(padded[31]).toBe(0x03);
    });

    it('should not modify 32-byte input', () => {
      const data = new Uint8Array(32).fill(0x42);
      const padded = pad32(data);
      expect(padded).toEqual(data);
    });

    it('should throw on input larger than 32 bytes', () => {
      const tooLarge = new Uint8Array(33);
      expect(() => pad32(tooLarge)).toThrow(/larger than 32 bytes/);
    });
  });

  describe('EIP-8050 canonical encodings', () => {
    describe('addresses - exactly 20 bytes', () => {
      it('should encode valid 20-byte address', () => {
        const address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
        const encoded = encodeAddress(address);
        expect(encoded.length).toBe(20);
      });

      it('should reject address with 19 bytes', () => {
        const shortAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA029'; // 19 bytes
        expect(() => encodeAddress(shortAddress)).toThrow(/Invalid address length/);
      });

      it('should reject address with 21 bytes', () => {
        const longAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA0291300'; // 21 bytes
        expect(() => encodeAddress(longAddress)).toThrow(/Invalid address length/);
      });

      it('should reject decoding non-20-byte array', () => {
        expect(() => decodeAddress(new Uint8Array(19))).toThrow(/Invalid address length/);
        expect(() => decodeAddress(new Uint8Array(21))).toThrow(/Invalid address length/);
      });
    });

    describe('amounts - minimal big-endian bytes, no leading zeros', () => {
      // Per spec: "big-endian minimal bytes with NO leading zero octets"

      it('should encode 255 as single byte 0xff', () => {
        const encoded = encodeAmount(255n);
        expect(encoded).toEqual(new Uint8Array([0xff]));
      });

      it('should encode 256 as two bytes 0x0100', () => {
        const encoded = encodeAmount(256n);
        expect(encoded).toEqual(new Uint8Array([0x01, 0x00]));
      });

      it('should encode 5000000 as 3 bytes (EIP-8050 example)', () => {
        // Per spec: "5000000 → 0x4c4b40 (3 bytes)"
        const encoded = encodeAmount(5000000n);
        expect(encoded).toEqual(new Uint8Array([0x4c, 0x4b, 0x40]));
      });

      it('should reject decoding bytes with leading zeros', () => {
        // Per spec: "Decoders MUST reject encodings with unnecessary leading zeros"
        const invalidEncoding = new Uint8Array([0x00, 0x01]); // 1 with leading zero
        expect(() => decodeAmount(invalidEncoding)).toThrow(/leading zeros/);
      });

      it('should accept single 0x00 byte for zero', () => {
        // Per spec: "Zero encoding: Encoders SHOULD encode zero as a single 0x00 byte"
        const encoded = encodeAmount(0n);
        expect(encoded).toEqual(new Uint8Array([0x00]));
      });

      it('should treat empty bytes as zero', () => {
        // Per spec: "Decoders MUST treat missing fields, empty bytes (length 0), and 0x00 (1 byte) as zero"
        expect(decodeAmount(new Uint8Array([]))).toBe(0n);
        expect(decodeAmount(new Uint8Array([0x00]))).toBe(0n);
      });
    });

    describe('fixed-size fields - salt/nonce must be 32 bytes', () => {
      it('should pad values to 32 bytes correctly', () => {
        // 20-byte address padded to 32
        const address = new Uint8Array(20).fill(0x42);
        const padded = pad32(address);
        expect(padded.length).toBe(32);
        expect(padded.slice(0, 12)).toEqual(new Uint8Array(12).fill(0)); // Left-padded with zeros
        expect(padded.slice(12)).toEqual(address);
      });

      it('should reject values larger than 32 bytes', () => {
        const tooLarge = new Uint8Array(33).fill(0x42);
        expect(() => pad32(tooLarge)).toThrow(/larger than 32 bytes/);
      });

      it('should not modify 32-byte values', () => {
        const exact = new Uint8Array(32).fill(0x42);
        const padded = pad32(exact);
        expect(padded).toEqual(exact);
      });
    });
  });

  describe('capabilities encoding (EIP-8050)', () => {
    // Per spec: "Each capability value is stored as the UTF-8 bytes of a JSON-serialized value"

    describe('allowed JSON types', () => {
      it('should encode object values', () => {
        const caps = {
          dataCallback: { callbackURL: 'https://example.com', events: ['initiated'] },
        };
        const encoded = encodeCapabilities(caps);
        const decoded = decodeCapabilities(encoded);
        expect(decoded).toEqual(caps);
      });

      it('should encode array values', () => {
        const caps = { events: ['initiated', 'postSign'] };
        const encoded = encodeCapabilities(caps);
        const decoded = decodeCapabilities(encoded);
        expect(decoded).toEqual(caps);
      });

      it('should encode string values', () => {
        // Per spec example: { "order_id": "ORDER-123" } stored as '"ORDER-123"'
        const caps = { order_id: 'ORDER-123' };
        const encoded = encodeCapabilities(caps);
        const decoded = decodeCapabilities(encoded);
        expect(decoded).toEqual(caps);
      });

      it('should encode number values', () => {
        // Per spec example: { "tip_bps": 50 } stored as '50'
        const caps = { tip_bps: 50 };
        const encoded = encodeCapabilities(caps);
        const decoded = decodeCapabilities(encoded);
        expect(decoded).toEqual(caps);
      });

      it('should encode boolean values', () => {
        const caps = { enabled: true, disabled: false };
        const encoded = encodeCapabilities(caps);
        const decoded = decodeCapabilities(encoded);
        expect(decoded).toEqual(caps);
      });

      it('should encode null values', () => {
        const caps = { nullValue: null };
        const encoded = encodeCapabilities(caps);
        const decoded = decodeCapabilities(encoded);
        expect(decoded).toEqual(caps);
      });
    });

    describe('error handling', () => {
      it('should throw on invalid UTF-8 bytes', () => {
        const invalidMap = new Map<string, Uint8Array>();
        invalidMap.set('test', new Uint8Array([0xff, 0xfe])); // Invalid UTF-8
        expect(() => decodeCapabilities(invalidMap)).toThrow(/Failed to decode capability/);
      });

      it('should throw on malformed JSON', () => {
        const malformedMap = new Map<string, Uint8Array>();
        malformedMap.set('test', new TextEncoder().encode('{ invalid json }'));
        expect(() => decodeCapabilities(malformedMap)).toThrow(/Failed to decode capability/);
      });
    });

    describe('ERC-8026 dataCallback capability', () => {
      it('should encode full dataCallback with data requests', () => {
        // Per spec example
        const caps = {
          dataCallback: {
            callbackURL: 'https://example.com/callback',
            events: [
              { type: 'initiated', context: { orderId: 'ORDER-123' } },
              {
                type: 'preSign',
                requests: [{ type: 'email' }, { type: 'physicalAddress', optional: true }],
              },
              { type: 'postSign' },
            ],
          },
        };
        const encoded = encodeCapabilities(caps);
        const decoded = decodeCapabilities(encoded);
        expect(decoded).toEqual(caps);
      });

      it('should encode simple dataCallback (notifications only)', () => {
        // Per spec simpler example
        const caps = {
          dataCallback: {
            callbackURL: 'https://example.com/callback',
            events: [{ type: 'initiated' }, { type: 'postSign' }],
          },
        };
        const encoded = encodeCapabilities(caps);
        const decoded = decodeCapabilities(encoded);
        expect(decoded).toEqual(caps);
      });
    });
  });

  describe('bytesToHex / hexToBytes', () => {
    it('should convert bytes to hex', () => {
      const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('0x12345678');
    });

    it('should convert zero to 0x0', () => {
      const bytes = new Uint8Array([0x00]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('0x0');
    });

    it('should remove leading zeros (minimal encoding)', () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x12, 0x34]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('0x1234');
    });

    it('should handle single leading zero byte', () => {
      const bytes = new Uint8Array([0x00, 0x12]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('0x12');
    });

    it('should convert hex to bytes', () => {
      const hex = '0x12345678';
      const bytes = hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78]));
    });

    it('should handle hex without 0x prefix', () => {
      const bytes = hexToBytes('12345678');
      expect(bytes).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78]));
    });

    it('should roundtrip correctly with leading zeros handled', () => {
      const original = new Uint8Array([1, 2, 255, 254, 253]);
      const hex = bytesToHex(original);
      // bytesToHex strips leading zeros, so we need to compare values
      expect(BigInt(hex)).toBe(
        BigInt(
          `0x${Array.from(original)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')}`
        )
      );
    });

    it('should handle odd-length hex strings correctly', () => {
      // Bug fix: 0x123 should be parsed as 0x0123, not lose data
      const hex = '0x123';
      const bytes = hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0x01, 0x23]));
    });

    it('should handle odd-length hex without 0x prefix', () => {
      const hex = '123';
      const bytes = hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0x01, 0x23]));
    });

    it('should handle single hex digit', () => {
      const hex = '0xa';
      const bytes = hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0x0a]));
    });

    it('should roundtrip odd-length hex correctly', () => {
      const hex = '0xabc';
      const bytes = hexToBytes(hex);
      const roundtrip = bytesToHex(bytes);
      // bytesToHex does minimal encoding, so it strips leading zeros
      expect(roundtrip).toBe('0xabc');
    });
  });
});

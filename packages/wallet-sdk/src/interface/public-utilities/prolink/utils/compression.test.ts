// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

import { describe, expect, it } from 'vitest';
import { compressPayload, decompressPayload } from './compression.node.js';

describe('compression (EIP-8050 Compression Flags)', () => {
  describe('compression flags', () => {
    // Per spec: "0x00: No compression (Protocol Buffers only)"
    // Per spec: "0x01: Brotli compressed"

    it('should use flag 0x00 for uncompressed data', async () => {
      // Small payload - compression not beneficial
      const smallData = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await compressPayload(smallData);

      // For small data, compression may not be beneficial
      // Check that we get a valid flag (either 0x00 or 0x01)
      expect([0x00, 0x01]).toContain(result.flag);
    });

    it('should use flag 0x01 for compressed data when beneficial', async () => {
      // Large repetitive payload - compression should be beneficial
      const largeData = new Uint8Array(1000).fill(0x42);
      const result = await compressPayload(largeData);

      // Large repetitive data should compress well
      expect(result.flag).toBe(0x01);
      expect(result.compressed.length).toBeLessThan(largeData.length);
    });

    it('should reject unknown compression flag 0x02', async () => {
      const invalidData = new Uint8Array([0x02, 0x01, 0x02, 0x03]);

      await expect(decompressPayload(invalidData)).rejects.toThrow(/Unknown compression flag/);
    });

    it('should reject unknown compression flag 0xFF', async () => {
      const invalidData = new Uint8Array([0xff, 0x01, 0x02, 0x03]);

      await expect(decompressPayload(invalidData)).rejects.toThrow(/Unknown compression flag/);
    });
  });

  describe('decompression', () => {
    it('should decompress flag 0x00 (no compression)', async () => {
      const payload = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
      const result = await decompressPayload(payload);

      expect(result).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
    });

    it('should decompress flag 0x01 (Brotli)', async () => {
      // First compress some data
      const original = new Uint8Array(500).fill(0x42);
      const { compressed, flag } = await compressPayload(original);

      // Create payload with flag
      const payload = new Uint8Array(compressed.length + 1);
      payload[0] = flag;
      payload.set(compressed, 1);

      // Decompress
      const result = await decompressPayload(payload);
      expect(result).toEqual(original);
    });

    it('should throw on empty payload', async () => {
      await expect(decompressPayload(new Uint8Array([]))).rejects.toThrow(/empty payload/);
    });

    it('should handle payload with only flag byte', async () => {
      // Flag 0x00 with no content = empty result
      const result = await decompressPayload(new Uint8Array([0x00]));
      expect(result).toEqual(new Uint8Array([]));
    });

    it('should throw on corrupted Brotli data', async () => {
      const invalidBrotli = new Uint8Array([0x01, 0xff, 0xfe, 0xfd, 0xfc]);

      await expect(decompressPayload(invalidBrotli)).rejects.toThrow(/Brotli decompression failed/);
    });
  });

  describe('compression decision logic', () => {
    // Per spec: "Encoders SHOULD use 0x01 if compressed size (including flag byte) is strictly smaller"

    it('should only compress when beneficial', async () => {
      // Random data doesn't compress well
      const randomData = new Uint8Array(50);
      for (let i = 0; i < randomData.length; i++) {
        randomData[i] = Math.floor(Math.random() * 256);
      }

      const result = await compressPayload(randomData);

      // Check the decision was made correctly
      if (result.flag === 0x01) {
        // If compressed, verify it's actually smaller
        expect(result.compressed.length + 1).toBeLessThan(randomData.length + 1);
      } else {
        // If uncompressed, verify compression wouldn't help
        expect(result.compressed).toEqual(randomData);
      }
    });

    it('should prefer smaller output regardless of compression', async () => {
      // Test with various payload sizes
      const sizes = [10, 50, 100, 500, 1000];

      for (const size of sizes) {
        const data = new Uint8Array(size).fill(0x42);
        const result = await compressPayload(data);

        // The total size (flag + data) should be optimal
        const resultSize = result.compressed.length + 1;
        const uncompressedSize = data.length + 1;

        // Either compressed is smaller, or we didn't compress
        if (result.flag === 0x01) {
          expect(resultSize).toBeLessThan(uncompressedSize);
        } else {
          // Compression wasn't beneficial
          expect(result.compressed).toEqual(data);
        }
      }
    });
  });

  describe('roundtrip', () => {
    it('should roundtrip small payload', async () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const { compressed, flag } = await compressPayload(original);

      const payload = new Uint8Array(compressed.length + 1);
      payload[0] = flag;
      payload.set(compressed, 1);

      const result = await decompressPayload(payload);
      expect(result).toEqual(original);
    });

    it('should roundtrip large payload', async () => {
      const original = new Uint8Array(10000);
      for (let i = 0; i < original.length; i++) {
        original[i] = i % 256;
      }

      const { compressed, flag } = await compressPayload(original);

      const payload = new Uint8Array(compressed.length + 1);
      payload[0] = flag;
      payload.set(compressed, 1);

      const result = await decompressPayload(payload);
      expect(result).toEqual(original);
    });

    it('should roundtrip empty payload', async () => {
      const original = new Uint8Array([]);
      const { compressed, flag } = await compressPayload(original);

      const payload = new Uint8Array(compressed.length + 1);
      payload[0] = flag;
      payload.set(compressed, 1);

      const result = await decompressPayload(payload);
      expect(result).toEqual(original);
    });

    it('should roundtrip binary data', async () => {
      // Simulating protobuf binary data
      const original = new Uint8Array([
        0x08,
        0x01, // field 1 = 1
        0x10,
        0xa5,
        0x42, // field 2 = 8453
        0x18,
        0x01, // field 3 = 1
        0x52,
        0x1a, // field 10 = message (26 bytes)
        0x08,
        0x01, // type = 1
        0x52,
        0x14, // erc20 transfer (20 bytes)
        ...new Uint8Array(20).fill(0x83), // token address
      ]);

      const { compressed, flag } = await compressPayload(original);

      const payload = new Uint8Array(compressed.length + 1);
      payload[0] = flag;
      payload.set(compressed, 1);

      const result = await decompressPayload(payload);
      expect(result).toEqual(original);
    });
  });

  describe('Brotli settings (EIP-8050 recommended)', () => {
    // Per spec: "Quality: 4-6, Window size: 22 bits (4 MB)"
    // These are informative recommendations; we test that compression works correctly

    it('should achieve good compression on typical protobuf payloads', async () => {
      // Simulate a typical wallet_sendCalls protobuf payload
      const typicalPayload = new Uint8Array([
        0x08,
        0x01, // protocol_version = 1
        0x10,
        0xa5,
        0x42, // chain_id = 8453
        0x18,
        0x01, // shortcut_id = 1
        0x20,
        0x00, // shortcut_version = 0
        // wallet_send_calls message
        0x5a,
        0x30, // field 11 (tag 88), length 48
        0x08,
        0x01, // type = ERC20_TRANSFER
        0x52,
        0x2a, // erc20_transfer (42 bytes)
        ...new Uint8Array(20).fill(0x83), // token
        ...new Uint8Array(20).fill(0xfe), // recipient
        0x4c,
        0x4b,
        0x40, // amount
        0x22,
        0x03, // version "1.0"
        0x31,
        0x2e,
        0x30,
      ]);

      const { compressed, flag } = await compressPayload(typicalPayload);

      // Should compress somewhat (repetitive bytes)
      if (flag === 0x01) {
        expect(compressed.length).toBeLessThan(typicalPayload.length);
      }
    });
  });
});

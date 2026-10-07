// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

import { describe, expect, it } from 'vitest';
import { decodeProlink, encodeProlink } from './index.node.js';

describe('prolink end-to-end', () => {
  describe('wallet_sendCalls', () => {
    it('should encode and decode ERC20 transfer', async () => {
      const request = {
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1.0',
            chainId: '0x2105',
            calls: [
              {
                to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                data: '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
                value: '0x0',
              },
            ],
          },
        ],
      };

      const encoded = await encodeProlink(request);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);

      const decoded = await decodeProlink(encoded);
      expect(decoded.method).toBe('wallet_sendCalls');
      expect(Array.isArray(decoded.params)).toBe(true);

      const params = (decoded.params as Array<{ chainId: string; calls: unknown[] }>)[0];
      expect(params.chainId).toBe('0x2105'); // hex string
      expect(params.calls.length).toBe(1);
    });

    it('should encode and decode native transfer', async () => {
      const request = {
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1.0',
            chainId: '0x1',
            calls: [
              {
                to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
                data: '0x',
                value: '0xde0b6b3a7640000',
              },
            ],
          },
        ],
      };

      const encoded = await encodeProlink(request);
      const decoded = await decodeProlink(encoded);

      expect(decoded.method).toBe('wallet_sendCalls');
      const params = (decoded.params as Array<{ chainId: string }>)[0];
      expect(params.chainId).toBe('0x1');
    });

    it('should encode and decode with capabilities', async () => {
      const request = {
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1.0',
            chainId: '0x1',
            calls: [
              {
                to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
                data: '0x',
                value: '0x100',
              },
            ],
          },
        ],
        capabilities: {
          dataCallback: {
            callbackURL: 'https://example.com',
            events: ['initiated'],
          },
        },
      };

      const encoded = await encodeProlink(request);
      const decoded = await decodeProlink(encoded);

      const params = (decoded.params as Array<{ capabilities?: Record<string, unknown> }>)[0];
      expect(params.capabilities).toBeDefined();
      expect(params.capabilities?.dataCallback).toEqual({
        callbackURL: 'https://example.com',
        events: ['initiated'],
      });
    });
  });

  describe('wallet_sign', () => {
    it('should encode and decode SpendPermission', async () => {
      const request = {
        method: 'wallet_sign',
        params: [
          {
            version: '1',
            chainId: '0x14a34',
            type: '0x01',
            data: {
              types: {
                SpendPermission: [
                  { name: 'account', type: 'address' },
                  { name: 'spender', type: 'address' },
                  { name: 'token', type: 'address' },
                  { name: 'allowance', type: 'uint160' },
                  { name: 'period', type: 'uint48' },
                  { name: 'start', type: 'uint48' },
                  { name: 'end', type: 'uint48' },
                  { name: 'salt', type: 'uint256' },
                  { name: 'extraData', type: 'bytes' },
                ],
              },
              domain: {
                name: 'Spend Permission Manager',
                version: '1',
                chainId: 84532,
                verifyingContract: '0xf85210b21cc50302f477ba56686d2019dc9b67ad',
              },
              primaryType: 'SpendPermission',
              message: {
                account: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                spender: '0x8d9F34934dc9619e5DC3Df27D0A40b4A744E7eAa',
                token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                allowance: '0x2710',
                period: 281474976710655,
                start: 0,
                end: 1914749767655,
                salt: '0x2d6688aae9435fb91ab0a1fe7ea54ec3ffd86e8e18a0c17e1923c467dea4b75f',
                extraData: '0x',
              },
            },
          },
        ],
      };

      const encoded = await encodeProlink(request);
      expect(typeof encoded).toBe('string');

      const decoded = await decodeProlink(encoded);
      expect(decoded.method).toBe('wallet_sign');
      const params = (
        decoded.params as Array<{ chainId: string; data: { primaryType: string } }>
      )[0];
      expect(params.chainId).toBe('0x14a34'); // hex string for 84532
      expect(params.data.primaryType).toBe('SpendPermission');
    });
  });

  describe('generic JSON-RPC', () => {
    it('should encode and decode generic method', async () => {
      const request = {
        method: 'eth_sendTransaction',
        params: [
          {
            from: '0x1111111111111111111111111111111111111111',
            to: '0x2222222222222222222222222222222222222222',
            value: '0x100',
            data: '0x',
          },
        ],
        chainId: 1,
      };

      const encoded = await encodeProlink(request);
      const decoded = await decodeProlink(encoded);

      expect(decoded.method).toBe('eth_sendTransaction');
      expect(decoded.chainId).toBe(1);
      expect(decoded.params).toEqual(request.params);
    });

    it('should encode and decode complex params', async () => {
      const request = {
        method: 'custom_method',
        params: {
          nested: {
            array: [1, 2, 3],
            string: 'test',
            bool: true,
          },
        },
      };

      const encoded = await encodeProlink(request);
      const decoded = await decodeProlink(encoded);

      expect(decoded.method).toBe('custom_method');
      expect(decoded.params).toEqual(request.params);
    });
  });

  describe('error handling', () => {
    it('should throw on invalid wallet_sendCalls params', async () => {
      const request = {
        method: 'wallet_sendCalls',
        params: [],
      };

      await expect(encodeProlink(request)).rejects.toThrow(/requires params array/);
    });

    it('should throw on missing chainId in wallet_sendCalls', async () => {
      const request = {
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1.0',
            calls: [],
          },
        ],
      };

      await expect(encodeProlink(request)).rejects.toThrow(/requires chainId/);
    });

    it('should throw on invalid base64url', async () => {
      await expect(decodeProlink('invalid!@#$%')).rejects.toThrow(/Invalid Base64url/);
    });

    it('should throw on unsupported protocol version', async () => {
      // Create a payload with protocol version 99
      // We need to encode a proper protobuf message with invalid protocol version
      // Format: [compression_flag, protobuf_data]
      // protobuf data: field 1 (protocol_version) = 99
      // varint encoding: field_tag = (1 << 3) | 0 = 0x08, value = 99 = 0x63
      const protobufData = new Uint8Array([0x08, 0x63]); // protocol_version = 99
      const withFlag = new Uint8Array([0x00, ...protobufData]); // No compression
      const { encodeBase64url } = await import('./utils/base64url.js');
      const invalidPayload = encodeBase64url(withFlag);

      await expect(decodeProlink(invalidPayload)).rejects.toThrow(/Unsupported protocol version/);
    });
  });

  describe('compression', () => {
    it('should use compression for large payloads', async () => {
      const request = {
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1.0',
            chainId: '0x1',
            calls: new Array(50).fill(null).map((_, _i) => ({
              to: `0x${'1'.repeat(40)}`,
              data: `0x${'ab'.repeat(100)}`,
              value: '0x0',
            })),
          },
        ],
      };

      const encoded = await encodeProlink(request);
      // Compressed payload should still be a valid base64url string
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);

      // Should be able to decode successfully
      const decoded = await decodeProlink(encoded);
      expect(decoded.method).toBe('wallet_sendCalls');
    });
  });

  describe('roundtrip correctness', () => {
    it('should preserve all data through roundtrip', async () => {
      const request = {
        method: 'wallet_sendCalls',
        params: [
          {
            version: '2.0',
            chainId: '0x2105',
            from: '0x1234567890123456789012345678901234567890',
            calls: [
              {
                to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                data: '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
                value: '0x0',
              },
            ],
          },
        ],
        capabilities: {
          order_id: 'ORDER-12345',
          tip_bps: 50,
        },
      };

      const encoded = await encodeProlink(request);
      const decoded = await decodeProlink(encoded);

      expect(decoded.method).toBe(request.method);
      const params = (
        decoded.params as Array<{
          version?: string;
          from?: string;
          chainId: string;
          capabilities?: Record<string, unknown>;
        }>
      )[0];
      expect(params.chainId).toBe('0x2105'); // hex string for 8453
      expect(params.capabilities).toEqual(request.capabilities);
      expect(params.version).toBe('2.0');
      expect(params.from?.toLowerCase()).toBe(request.params[0].from.toLowerCase());
    });
  });
});

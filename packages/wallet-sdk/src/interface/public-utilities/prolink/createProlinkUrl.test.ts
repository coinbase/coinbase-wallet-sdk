// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

import { describe, expect, it } from 'vitest';
import { createProlinkUrl } from './createProlinkUrl.js';
import { encodeProlink } from './index.node.js';

describe('createProlinkUrl', () => {
  const EXAMPLE_PROLINK = 'CAEQhUIgAigFcn0KFKqqqqqqqqqqqqqqqqqqqqqqqqqqEhQxlx8zf';

  describe('basic functionality', () => {
    it('should create URL with default base URL', () => {
      const result = createProlinkUrl(EXAMPLE_PROLINK);
      expect(result).toBe(`https://base.app/base-pay?p=${EXAMPLE_PROLINK}`);
    });

    it('should create URL with custom base URL', () => {
      const result = createProlinkUrl(EXAMPLE_PROLINK, 'https://custom.com/pay');
      expect(result).toBe(`https://custom.com/pay?p=${EXAMPLE_PROLINK}`);
    });

    it('should work with deeplink URLs', () => {
      const result = createProlinkUrl(EXAMPLE_PROLINK, 'myapp://pay');
      expect(result).toBe(`myapp://pay?p=${EXAMPLE_PROLINK}`);
    });
  });

  describe('additional query parameters', () => {
    it('should add additional query parameters', () => {
      const result = createProlinkUrl(EXAMPLE_PROLINK, undefined, {
        ref: 'promo',
        utm_source: 'email',
      });
      const url = new URL(result);
      expect(url.searchParams.get('p')).toBe(EXAMPLE_PROLINK);
      expect(url.searchParams.get('ref')).toBe('promo');
      expect(url.searchParams.get('utm_source')).toBe('email');
    });

    it('should work with custom base URL and additional params', () => {
      const result = createProlinkUrl(EXAMPLE_PROLINK, 'https://custom.com/pay', {
        campaign: 'summer',
      });
      const url = new URL(result);
      expect(url.hostname).toBe('custom.com');
      expect(url.searchParams.get('p')).toBe(EXAMPLE_PROLINK);
      expect(url.searchParams.get('campaign')).toBe('summer');
    });

    it('should handle empty additional params object', () => {
      const result = createProlinkUrl(EXAMPLE_PROLINK, undefined, {});
      expect(result).toBe(`https://base.app/base-pay?p=${EXAMPLE_PROLINK}`);
    });
  });

  describe('URL encoding', () => {
    it('should handle prolinks with special base64url characters', () => {
      // Base64url uses A-Z, a-z, 0-9, -, _
      const prolinkWithSpecialChars =
        'CAEQ-_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const result = createProlinkUrl(prolinkWithSpecialChars);
      expect(result).toBe(`https://base.app/base-pay?p=${prolinkWithSpecialChars}`);
      // Verify it's a valid URL
      expect(() => new URL(result)).not.toThrow();
    });

    it('should create valid URL object', () => {
      const result = createProlinkUrl(EXAMPLE_PROLINK);
      const url = new URL(result);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('base.app');
      expect(url.pathname).toBe('/base-pay');
      expect(url.searchParams.get('p')).toBe(EXAMPLE_PROLINK);
    });

    it('should properly encode query parameter values', () => {
      const result = createProlinkUrl(EXAMPLE_PROLINK, undefined, {
        message: 'hello world',
        special: 'a&b=c',
      });
      const url = new URL(result);
      expect(url.searchParams.get('message')).toBe('hello world');
      expect(url.searchParams.get('special')).toBe('a&b=c');
    });
  });

  describe('integration with encodeProlink', () => {
    it('should create URL from encoded wallet_sendCalls', async () => {
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

      const prolink = await encodeProlink(request);
      const result = createProlinkUrl(prolink);

      expect(result).toContain('https://base.app/base-pay?p=');
      expect(result).toContain(prolink);

      // Verify the URL is valid
      const url = new URL(result);
      expect(url.searchParams.get('p')).toBe(prolink);
    });

    it('should create URL from encoded wallet_sign', async () => {
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

      const prolink = await encodeProlink(request);
      const result = createProlinkUrl(prolink, 'https://base-staging.coinbase.com/base-pay');

      expect(result).toContain('https://base-staging.coinbase.com/base-pay?p=');
      expect(result).toContain(prolink);
    });

    it('should create URL from encoded generic RPC', async () => {
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

      const prolink = await encodeProlink(request);
      const result = createProlinkUrl(prolink);

      expect(result).toContain('https://base.app/base-pay?p=');
      expect(result).toContain(prolink);
    });
  });

  describe('error handling', () => {
    it('should throw on empty prolink string', () => {
      expect(() => createProlinkUrl('')).toThrow('prolink cannot be empty');
    });

    it('should throw on whitespace-only prolink string', () => {
      expect(() => createProlinkUrl('   ')).toThrow('prolink cannot be empty');
    });

    it('should throw on empty url', () => {
      expect(() => createProlinkUrl(EXAMPLE_PROLINK, '')).toThrow('url cannot be empty');
    });

    it('should throw on whitespace-only url', () => {
      expect(() => createProlinkUrl(EXAMPLE_PROLINK, '   ')).toThrow('url cannot be empty');
    });

    it('should throw on invalid url', () => {
      expect(() => createProlinkUrl(EXAMPLE_PROLINK, 'not a url')).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very long prolinks', () => {
      // Simulate a very long prolink (e.g., from a large transaction)
      const longProlink = 'A'.repeat(1000);
      const result = createProlinkUrl(longProlink);
      expect(result).toContain('https://base.app/base-pay?p=');
      expect(result).toContain(longProlink);
      // Verify it's still a valid URL
      expect(() => new URL(result)).not.toThrow();
    });

    it('should preserve exact prolink value in query param', () => {
      const testCases = [
        'CAEQhUIgAigF',
        'simple',
        'with-dashes',
        'with_underscores',
        '123456789',
        'MixedCase123',
      ];

      for (const prolink of testCases) {
        const result = createProlinkUrl(prolink);
        const url = new URL(result);
        expect(url.searchParams.get('p')).toBe(prolink);
      }
    });

    it('should handle base URLs with existing query params', () => {
      const result = createProlinkUrl(EXAMPLE_PROLINK, 'https://base.app/base-pay?existing=param');
      const url = new URL(result);
      expect(url.searchParams.get('existing')).toBe('param');
      expect(url.searchParams.get('p')).toBe(EXAMPLE_PROLINK);
    });

    it('should handle base URLs with paths and fragments', () => {
      const result = createProlinkUrl(EXAMPLE_PROLINK, 'https://example.com/path/to/pay#section');
      const url = new URL(result);
      expect(url.pathname).toBe('/path/to/pay');
      expect(url.hash).toBe('#section');
      expect(url.searchParams.get('p')).toBe(EXAMPLE_PROLINK);
    });
  });
});

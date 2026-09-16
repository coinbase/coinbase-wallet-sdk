import { describe, expect, it } from 'vitest';
import { CHAIN_IDS, TOKENS } from '../constants.js';
import type { PayerInfo } from '../types.js';
import {
  buildSendCallsRequest,
  encodeTransferCall,
  translatePaymentToSendCalls,
} from './translatePayment.js';

describe('translatePayment', () => {
  describe('encodeTransferCall', () => {
    it('should encode a transfer call correctly', () => {
      const recipient = '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51';
      const amount = '10.50';

      const result = encodeTransferCall(recipient, amount);

      expect(result).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(result.length).toBeGreaterThan(2);
    });
  });

  describe('buildSendCallsRequest', () => {
    it('should build request without payerInfo', () => {
      const transferData = '0xabcdef';
      const testnet = false;

      const result = buildSendCallsRequest(transferData, testnet);

      expect(result).toEqual({
        version: '2.0.0',
        chainId: CHAIN_IDS.base,
        calls: [
          {
            to: TOKENS.USDC.addresses.base,
            data: transferData,
            value: '0x0',
          },
        ],
        capabilities: {},
      });
    });

    it('should include attribution suffix when dataSuffix is provided', () => {
      const transferData = '0xabcdef';
      const testnet = false;
      const dataSuffix = '0xfeedbeef';

      const result = buildSendCallsRequest(transferData, testnet, undefined, dataSuffix);

      expect(result).toEqual({
        version: '2.0.0',
        chainId: CHAIN_IDS.base,
        calls: [
          {
            to: TOKENS.USDC.addresses.base,
            data: transferData,
            value: '0x0',
          },
        ],
        capabilities: {
          attribution: {
            suffix: dataSuffix,
          },
        },
      });
    });

    it('should build request with payerInfo', () => {
      const transferData = '0xabcdef';
      const testnet = false;
      const payerInfo: PayerInfo = {
        requests: [{ type: 'email' }, { type: 'physicalAddress', optional: true }],
        callbackURL: 'https://example.com/callback',
      };

      const result = buildSendCallsRequest(transferData, testnet, payerInfo);

      expect(result).toEqual({
        version: '2.0.0',
        chainId: CHAIN_IDS.base,
        calls: [
          {
            to: TOKENS.USDC.addresses.base,
            data: transferData,
            value: '0x0',
          },
        ],
        capabilities: {
          dataCallback: {
            requests: [
              { type: 'email', optional: false },
              { type: 'physicalAddress', optional: true },
            ],
            callbackURL: 'https://example.com/callback',
          },
        },
      });
    });

    it('should build request for testnet', () => {
      const transferData = '0xabcdef';
      const testnet = true;

      const result = buildSendCallsRequest(transferData, testnet);

      expect(result).toEqual({
        version: '2.0.0',
        chainId: CHAIN_IDS.baseSepolia,
        calls: [
          {
            to: TOKENS.USDC.addresses.baseSepolia,
            data: transferData,
            value: '0x0',
          },
        ],
        capabilities: {},
      });
    });

    it('should handle payerInfo without callbackURL', () => {
      const transferData = '0xabcdef';
      const testnet = false;
      const payerInfo: PayerInfo = {
        requests: [{ type: 'email' }],
      };

      const result = buildSendCallsRequest(transferData, testnet, payerInfo);

      expect(result).toEqual({
        version: '2.0.0',
        chainId: CHAIN_IDS.base,
        calls: [
          {
            to: TOKENS.USDC.addresses.base,
            data: transferData,
            value: '0x0',
          },
        ],
        capabilities: {
          dataCallback: {
            requests: [{ type: 'email', optional: false }],
          },
        },
      });
    });

    it('should handle empty payerInfo array', () => {
      const transferData = '0xabcdef';
      const testnet = false;
      const payerInfo: PayerInfo = {
        requests: [],
        callbackURL: 'https://example.com/callback',
      };

      const result = buildSendCallsRequest(transferData, testnet, payerInfo);

      expect(result).toEqual({
        version: '2.0.0',
        chainId: CHAIN_IDS.base,
        calls: [
          {
            to: TOKENS.USDC.addresses.base,
            data: transferData,
            value: '0x0',
          },
        ],
        capabilities: {},
      });
    });

    it('should default optional to false when not specified', () => {
      const transferData = '0xabcdef';
      const testnet = false;
      const payerInfo: PayerInfo = {
        requests: [{ type: 'email' }, { type: 'name', optional: undefined }],
        callbackURL: 'https://example.com/callback',
      };

      const result = buildSendCallsRequest(transferData, testnet, payerInfo);

      expect(result.capabilities).toEqual({
        dataCallback: {
          requests: [
            { type: 'email', optional: false },
            { type: 'name', optional: false },
          ],
          callbackURL: 'https://example.com/callback',
        },
      });
    });
  });

  describe('translatePaymentToSendCalls', () => {
    it('should translate payment without payerInfo', () => {
      const recipient = '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51';
      const amount = '10.50';
      const testnet = false;

      const result = translatePaymentToSendCalls(recipient, amount, testnet);

      expect(result).toEqual({
        version: '2.0.0',
        chainId: CHAIN_IDS.base,
        calls: [
          {
            to: TOKENS.USDC.addresses.base,
            data: expect.stringMatching(/^0x[a-fA-F0-9]+$/),
            value: '0x0',
          },
        ],
        capabilities: {},
      });
    });

    it('should translate payment with payerInfo', () => {
      const recipient = '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51';
      const amount = '10.50';
      const testnet = false;
      const payerInfo: PayerInfo = {
        requests: [
          { type: 'email' },
          { type: 'physicalAddress', optional: true },
          { type: 'phoneNumber', optional: false },
        ],
        callbackURL: 'https://example.com/callback',
      };

      const result = translatePaymentToSendCalls(recipient, amount, testnet, payerInfo);

      expect(result).toEqual({
        version: '2.0.0',
        chainId: CHAIN_IDS.base,
        calls: [
          {
            to: TOKENS.USDC.addresses.base,
            data: expect.stringMatching(/^0x[a-fA-F0-9]+$/),
            value: '0x0',
          },
        ],
        capabilities: {
          dataCallback: {
            requests: [
              { type: 'email', optional: false },
              { type: 'physicalAddress', optional: true },
              { type: 'phoneNumber', optional: false },
            ],
            callbackURL: 'https://example.com/callback',
          },
        },
      });
    });

    it('should translate payment for testnet with payerInfo', () => {
      const recipient = '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51';
      const amount = '5.00';
      const testnet = true;
      const payerInfo: PayerInfo = {
        requests: [{ type: 'name', optional: true }],
        callbackURL: 'https://example.com/callback',
      };

      const result = translatePaymentToSendCalls(recipient, amount, testnet, payerInfo);

      expect(result).toEqual({
        version: '2.0.0',
        chainId: CHAIN_IDS.baseSepolia,
        calls: [
          {
            to: TOKENS.USDC.addresses.baseSepolia,
            data: expect.stringMatching(/^0x[a-fA-F0-9]+$/),
            value: '0x0',
          },
        ],
        capabilities: {
          dataCallback: {
            requests: [{ type: 'name', optional: true }],
            callbackURL: 'https://example.com/callback',
          },
        },
      });
    });

    it('should translate payment with dataSuffix attribution capability', () => {
      const recipient = '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51';
      const amount = '10.50';
      const testnet = false;
      const dataSuffix = '0xfeedbeef';

      const result = translatePaymentToSendCalls(recipient, amount, testnet, undefined, dataSuffix);

      expect(result).toEqual({
        version: '2.0.0',
        chainId: CHAIN_IDS.base,
        calls: [
          {
            to: TOKENS.USDC.addresses.base,
            data: expect.stringMatching(/^0x[a-fA-F0-9]+$/),
            value: '0x0',
          },
        ],
        capabilities: {
          attribution: {
            suffix: dataSuffix,
          },
        },
      });
    });
  });
});

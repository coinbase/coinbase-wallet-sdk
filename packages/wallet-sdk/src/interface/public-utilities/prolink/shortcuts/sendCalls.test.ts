// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

import { describe, expect, it } from 'vitest';
import { SendCallsType } from '../types.js';
import { decodeWalletSendCalls, encodeWalletSendCalls } from './sendCalls.js';

describe('sendCalls shortcut (EIP-8050 Shortcut 1)', () => {
  describe('ERC20 transfer detection', () => {
    it('should detect ERC20 transfer', () => {
      const params = {
        version: '1.0',
        chainId: '0x2105',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);

      expect(encoded.type).toBe(SendCallsType.ERC20_TRANSFER);
      expect(encoded.transactionData.case).toBe('erc20Transfer');

      if (encoded.transactionData.case === 'erc20Transfer') {
        const { token, recipient, amount } = encoded.transactionData.value;
        expect(token.length).toBe(20);
        expect(recipient.length).toBe(20);
        expect(amount).toEqual(new Uint8Array([0x4c, 0x4b, 0x40]));
      }
    });

    it('should NOT detect ERC20 if multiple calls', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
            value: '0x0',
          },
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0x',
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.GENERIC_CALLS);
    });

    it('should NOT detect ERC20 if non-zero value', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
            value: '0x1',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.GENERIC_CALLS);
    });

    it('should NOT detect ERC20 if wrong data length', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0xa9059cbb0000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e51',
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.GENERIC_CALLS);
    });
  });

  describe('Native transfer detection', () => {
    it('should detect native transfer', () => {
      const params = {
        version: '1.0',
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0xde0b6b3a7640000',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);

      expect(encoded.type).toBe(SendCallsType.NATIVE_TRANSFER);
      expect(encoded.transactionData.case).toBe('nativeTransfer');

      if (encoded.transactionData.case === 'nativeTransfer') {
        const { recipient, amount } = encoded.transactionData.value;
        expect(recipient.length).toBe(20);
        expect(amount).toEqual(new Uint8Array([0x0d, 0xe0, 0xb6, 0xb3, 0xa7, 0x64, 0x00, 0x00]));
      }
    });

    it('should NOT detect native if has data', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x1234',
            value: '0xde0b6b3a7640000',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.GENERIC_CALLS);
    });

    it('should NOT detect native if zero value', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.GENERIC_CALLS);
    });
  });

  describe('Generic calls', () => {
    it('should encode multiple calls as generic', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0x1111111111111111111111111111111111111111',
            data: '0x1234',
            value: '0x0',
          },
          {
            to: '0x2222222222222222222222222222222222222222',
            data: '0x5678',
            value: '0x100',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);

      expect(encoded.type).toBe(SendCallsType.GENERIC_CALLS);
      expect(encoded.transactionData.case).toBe('genericCalls');

      if (encoded.transactionData.case === 'genericCalls') {
        expect(encoded.transactionData.value.calls.length).toBe(2);
      }
    });
  });

  describe('ERC20 roundtrip', () => {
    it('should roundtrip ERC20 transfer', () => {
      const params = {
        version: '1.0',
        chainId: '0x2105',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      const decoded = decodeWalletSendCalls(encoded, 8453);

      expect(decoded.chainId).toBe(params.chainId);
      expect(decoded.version).toBe(params.version);
      expect(decoded.calls.length).toBe(1);

      // Normalize addresses for comparison
      expect(decoded.calls[0].to.toLowerCase()).toBe(params.calls[0].to.toLowerCase());
      expect(decoded.calls[0].data?.toLowerCase()).toBe(params.calls[0].data.toLowerCase());
      expect(decoded.calls[0].value).toBe(params.calls[0].value);
    });
  });

  describe('Native transfer roundtrip', () => {
    it('should roundtrip native transfer', () => {
      const params = {
        version: '1.0',
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0xde0b6b3a7640000',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      const decoded = decodeWalletSendCalls(encoded, 1);

      expect(decoded.chainId).toBe(params.chainId);
      expect(decoded.version).toBe(params.version);
      expect(decoded.calls.length).toBe(1);
      expect(decoded.calls[0].to.toLowerCase()).toBe(params.calls[0].to.toLowerCase());
      expect(decoded.calls[0].data).toBe(params.calls[0].data);
      expect(decoded.calls[0].value?.toLowerCase()).toBe(params.calls[0].value.toLowerCase());
    });
  });

  describe('Generic calls roundtrip', () => {
    it('should roundtrip generic calls', () => {
      const params = {
        version: '1.0',
        chainId: '0x1',
        calls: [
          {
            to: '0x1111111111111111111111111111111111111111',
            data: '0x1234',
            value: '0x0',
          },
          {
            to: '0x2222222222222222222222222222222222222222',
            data: '0x5678',
            value: '0x100',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      const decoded = decodeWalletSendCalls(encoded, 1);

      expect(decoded.calls.length).toBe(2);
      expect(decoded.calls[0].to.toLowerCase()).toBe(params.calls[0].to.toLowerCase());
      expect(decoded.calls[1].to.toLowerCase()).toBe(params.calls[1].to.toLowerCase());
    });
  });

  describe('EIP-8050 type detection order', () => {
    // Per spec: "Encoders MUST detect transaction types in this order:
    // 1. ERC20 Transfer, 2. Native Transfer, 3. Generic Calls"

    it('should prioritize ERC20 over native (ERC20 has data)', () => {
      // A call with ERC20 transfer data should be detected as ERC20, not native
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.ERC20_TRANSFER);
    });

    it('should detect native only with empty data', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0x100',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.NATIVE_TRANSFER);
    });
  });

  describe('ERC20 transfer edge cases', () => {
    // Per spec: data starts with 0xa9059cbb, data length is exactly 68 bytes (136 hex chars)

    it('should NOT detect ERC20 with wrong selector', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            // transferFrom selector instead of transfer
            data: '0x23b872dd000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.GENERIC_CALLS);
    });

    it('should NOT detect ERC20 with data too short', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0xa9059cbb0000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e51', // Short
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.GENERIC_CALLS);
    });

    it('should NOT detect ERC20 with data too long', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            // 68 bytes + extra byte
            data: '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b4000',
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.GENERIC_CALLS);
    });

    it('should handle case-insensitive selector matching', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            // Uppercase selector
            data: '0xA9059CBB000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.ERC20_TRANSFER);
    });

    it('should accept value as empty string as zero', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
            // Missing value treated as zero
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.ERC20_TRANSFER);
    });
  });

  describe('Native transfer edge cases', () => {
    it('should accept empty string data as empty', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '', // Empty string instead of 0x
            value: '0x100',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.NATIVE_TRANSFER);
    });

    it('should NOT detect native if data is 0x00', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x00', // Single zero byte is not empty
            value: '0x100',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.type).toBe(SendCallsType.GENERIC_CALLS);
    });
  });

  describe('from field handling', () => {
    it('should preserve from field in encoding', () => {
      const params = {
        version: '1.0',
        chainId: '0x1',
        from: '0x1234567890123456789012345678901234567890',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0x100',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.from).toBeDefined();
      expect(encoded.from?.length).toBe(20);
    });

    it('should decode from field correctly', () => {
      const params = {
        version: '1.0',
        chainId: '0x1',
        from: '0x1234567890123456789012345678901234567890',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0x100',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      const decoded = decodeWalletSendCalls(encoded, 1);

      expect(decoded.from?.toLowerCase()).toBe(params.from.toLowerCase());
    });

    it('should handle missing from field', () => {
      const params = {
        version: '1.0',
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0x100',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.from).toBeUndefined();

      const decoded = decodeWalletSendCalls(encoded, 1);
      expect(decoded.from).toBeUndefined();
    });
  });

  describe('version field handling', () => {
    it('should default version to 1.0', () => {
      const params = {
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0x100',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.version).toBe('1.0');
    });

    it('should preserve custom version', () => {
      const params = {
        version: '2.0',
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0x100',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);
      expect(encoded.version).toBe('2.0');

      const decoded = decodeWalletSendCalls(encoded, 1);
      expect(decoded.version).toBe('2.0');
    });
  });

  describe('capabilities handling', () => {
    it('should include capabilities in decoded params', () => {
      const params = {
        version: '1.0',
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0x100',
          },
        ],
      };

      const capabilities = {
        dataCallback: {
          callbackURL: 'https://example.com/callback',
          events: ['initiated'],
        },
        order_id: 'ORDER-123',
      };

      const encoded = encodeWalletSendCalls(params);
      const decoded = decodeWalletSendCalls(encoded, 1, capabilities);

      expect(decoded.capabilities).toEqual(capabilities);
    });
  });

  describe('EIP-8050 Test Vector 1: ERC20 Transfer', () => {
    // Test vector from the spec
    it('should match spec test vector structure', () => {
      const params = {
        version: '1.0',
        chainId: '0x2105',
        calls: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0xa9059cbb000000000000000000000000fe21034794a5a574b94fe4fdfd16e005f1c96e5100000000000000000000000000000000000000000000000000000000004c4b40',
            value: '0x0',
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);

      expect(encoded.type).toBe(SendCallsType.ERC20_TRANSFER);
      expect(encoded.version).toBe('1.0');

      if (encoded.transactionData.case === 'erc20Transfer') {
        const { amount } = encoded.transactionData.value;
        // 5000000 = 0x4c4b40 (3 bytes)
        expect(amount).toEqual(new Uint8Array([0x4c, 0x4b, 0x40]));
      }
    });
  });

  describe('EIP-8050 Test Vector 2: Native Transfer', () => {
    // Test vector from the spec
    it('should match spec test vector structure', () => {
      const params = {
        version: '1.0',
        chainId: '0x1',
        calls: [
          {
            to: '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51',
            data: '0x',
            value: '0xde0b6b3a7640000', // 1 ETH
          },
        ],
      };

      const encoded = encodeWalletSendCalls(params);

      expect(encoded.type).toBe(SendCallsType.NATIVE_TRANSFER);
      expect(encoded.version).toBe('1.0');

      if (encoded.transactionData.case === 'nativeTransfer') {
        const { amount } = encoded.transactionData.value;
        // 1 ETH = 0x0de0b6b3a7640000 (8 bytes)
        expect(amount).toEqual(new Uint8Array([0x0d, 0xe0, 0xb6, 0xb3, 0xa7, 0x64, 0x00, 0x00]));
      }
    });
  });
});

// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

import { describe, expect, it } from 'vitest';
import { SignType } from '../types.js';
import { decodeWalletSign, encodeWalletSign } from './sign.js';

describe('sign shortcut', () => {
  describe('SpendPermission detection (EIP-8050 Shortcut 2)', () => {
    it('should detect SpendPermission typed data', () => {
      const params = {
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
      };

      const encoded = encodeWalletSign(params);

      expect(encoded.type).toBe(SignType.SPEND_PERMISSION);
      expect(encoded.signatureData.case).toBe('spendPermission');

      if (encoded.signatureData.case === 'spendPermission') {
        const sp = encoded.signatureData.value;
        expect(sp.account.length).toBe(20);
        expect(sp.spender.length).toBe(20);
        expect(sp.token.length).toBe(20);
        expect(sp.verifyingContract.length).toBe(20);
        expect(sp.salt.length).toBe(32);
        expect(sp.domainName).toBe('Spend Permission Manager');
        expect(sp.domainVersion).toBe('1');
      }
    });

    it('should NOT detect SpendPermission without verifyingContract', () => {
      const params = {
        version: '1',
        chainId: '0x1',
        type: '0x01',
        data: {
          types: {
            SpendPermission: [{ name: 'account', type: 'address' }],
          },
          domain: {
            name: 'Test',
            version: '1',
            chainId: 1,
            // Missing verifyingContract
          },
          primaryType: 'SpendPermission',
          message: {
            account: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          },
        },
      };

      const encoded = encodeWalletSign(params as Parameters<typeof encodeWalletSign>[0]);
      expect(encoded.type).toBe(SignType.GENERIC_TYPED_DATA);
    });
  });

  describe('ReceiveWithAuthorization detection', () => {
    it('should detect ReceiveWithAuthorization typed data', () => {
      const params = {
        version: '1',
        chainId: '0x2105',
        type: '0x01',
        data: {
          types: {
            ReceiveWithAuthorization: [
              { name: 'from', type: 'address' },
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'validAfter', type: 'uint256' },
              { name: 'validBefore', type: 'uint256' },
              { name: 'nonce', type: 'bytes32' },
            ],
          },
          domain: {
            name: 'USDC',
            version: '2',
            chainId: 8453,
            verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          },
          primaryType: 'ReceiveWithAuthorization',
          message: {
            from: '0x1111111111111111111111111111111111111111',
            to: '0x2222222222222222222222222222222222222222',
            value: '0x5f5e100',
            validAfter: '0x0',
            validBefore: '0xffffffffffffffff',
            nonce: '0x1234567890123456789012345678901234567890123456789012345678901234',
          },
        },
      };

      const encoded = encodeWalletSign(params);

      expect(encoded.type).toBe(SignType.RECEIVE_WITH_AUTHORIZATION);
      expect(encoded.signatureData.case).toBe('receiveWithAuthorization');

      if (encoded.signatureData.case === 'receiveWithAuthorization') {
        const rwa = encoded.signatureData.value;
        expect(rwa.from.length).toBe(20);
        expect(rwa.to.length).toBe(20);
        expect(rwa.nonce.length).toBe(32);
        expect(rwa.domainName).toBe('USDC');
        expect(rwa.domainVersion).toBe('2');
      }
    });
  });

  describe('Generic typed data fallback', () => {
    it('should encode unknown primaryType as generic', () => {
      const params = {
        version: '1',
        chainId: '0x1',
        type: '0x01',
        data: {
          types: {
            CustomMessage: [
              { name: 'foo', type: 'string' },
              { name: 'bar', type: 'uint256' },
            ],
          },
          domain: {
            name: 'Custom App',
            version: '1',
            chainId: 1,
            verifyingContract: '0x1111111111111111111111111111111111111111',
          },
          primaryType: 'CustomMessage',
          message: {
            foo: 'hello',
            bar: 12345,
          },
        },
      };

      const encoded = encodeWalletSign(params);

      expect(encoded.type).toBe(SignType.GENERIC_TYPED_DATA);
      expect(encoded.signatureData.case).toBe('genericTypedData');

      if (encoded.signatureData.case === 'genericTypedData') {
        const json = new TextDecoder().decode(encoded.signatureData.value.typedDataJson);
        const parsed = JSON.parse(json);
        expect(parsed.primaryType).toBe('CustomMessage');
      }
    });
  });

  describe('Type field normalization (EIP-8050 requirement)', () => {
    // Per spec: "Encoders MUST accept the following variants as equivalent to EIP-712"

    it('should accept type as "0x01" (canonical)', () => {
      const params = createValidSignParams({ type: '0x01' });
      expect(() => encodeWalletSign(params)).not.toThrow();
    });

    it('should accept type as "0x1" (no leading zero)', () => {
      const params = createValidSignParams({ type: '0x1' });
      expect(() => encodeWalletSign(params)).not.toThrow();
    });

    it('should accept type as number 1', () => {
      const params = createValidSignParams({ type: 1 });
      expect(() => encodeWalletSign(params)).not.toThrow();
    });

    it('should accept missing type field (assume EIP-712)', () => {
      const params = createValidSignParams({});
      delete (params as { type?: string | number }).type;
      expect(() => encodeWalletSign(params)).not.toThrow();
    });

    it('should reject unsupported sign type', () => {
      const params = createValidSignParams({ type: '0x02' });
      expect(() => encodeWalletSign(params)).toThrow(/Unsupported sign type/);
    });
  });

  describe('Chain ID validation (EIP-8050 requirement)', () => {
    // Per spec: "Encoders MUST verify that params.chainId and domain.chainId represent the same chain"

    it('should accept matching chainIds', () => {
      const params = createValidSignParams({
        chainId: '0x1',
        domainChainId: 1,
      });
      expect(() => encodeWalletSign(params)).not.toThrow();
    });

    it('should reject mismatched chainIds', () => {
      const params = createValidSignParams({
        chainId: '0x1',
        domainChainId: 8453,
      });
      expect(() => encodeWalletSign(params)).toThrow(/Chain ID mismatch/);
    });

    it('should handle chainId as hex string in domain', () => {
      const params = {
        version: '1',
        chainId: '0x2105',
        type: '0x01',
        data: {
          types: { CustomType: [{ name: 'x', type: 'uint256' }] },
          domain: {
            name: 'Test',
            version: '1',
            chainId: '0x2105', // hex string in domain
            verifyingContract: '0x1111111111111111111111111111111111111111',
          },
          primaryType: 'CustomType',
          message: { x: 1 },
        },
      };
      expect(() => encodeWalletSign(params)).not.toThrow();
    });
  });

  describe('SpendPermission roundtrip (EIP-8050 Test Vector 3)', () => {
    it('should roundtrip SpendPermission with all fields', () => {
      const params = {
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
      };

      const encoded = encodeWalletSign(params);
      const decoded = decodeWalletSign(encoded, 84532);

      expect(decoded.chainId).toBe('0x14a34');
      expect(decoded.type).toBe('0x01');
      expect(decoded.data.primaryType).toBe('SpendPermission');
      expect(decoded.data.domain.name).toBe('Spend Permission Manager');
      expect(decoded.data.domain.verifyingContract?.toLowerCase()).toBe(
        '0xf85210b21cc50302f477ba56686d2019dc9b67ad'
      );
      expect(decoded.data.message.account).toBe(
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'.toLowerCase()
      );
      expect(decoded.data.message.period).toBe(281474976710655);
      expect(decoded.data.message.start).toBe(0);
      expect(decoded.data.message.end).toBe(1914749767655);
      expect((decoded.data.message.extraData as string).toLowerCase()).toBe('0x');
    });
  });

  describe('ReceiveWithAuthorization roundtrip', () => {
    it('should roundtrip ReceiveWithAuthorization with all fields', () => {
      const params = {
        version: '1',
        chainId: '0x2105',
        type: '0x01',
        data: {
          types: {
            ReceiveWithAuthorization: [
              { name: 'from', type: 'address' },
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'validAfter', type: 'uint256' },
              { name: 'validBefore', type: 'uint256' },
              { name: 'nonce', type: 'bytes32' },
            ],
          },
          domain: {
            name: 'USDC',
            version: '2',
            chainId: 8453,
            verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          },
          primaryType: 'ReceiveWithAuthorization',
          message: {
            from: '0x1111111111111111111111111111111111111111',
            to: '0x2222222222222222222222222222222222222222',
            value: '0x5f5e100',
            validAfter: '0x0',
            validBefore: '0xffffffffffffffff',
            nonce: '0x1234567890123456789012345678901234567890123456789012345678901234',
          },
        },
      };

      const encoded = encodeWalletSign(params);
      const decoded = decodeWalletSign(encoded, 8453);

      expect(decoded.chainId).toBe('0x2105');
      expect(decoded.data.primaryType).toBe('ReceiveWithAuthorization');
      expect(decoded.data.domain.name).toBe('USDC');
      expect(decoded.data.message.from).toBe(
        '0x1111111111111111111111111111111111111111'.toLowerCase()
      );
    });
  });

  describe('Generic typed data roundtrip', () => {
    it('should roundtrip generic typed data', () => {
      const params = {
        version: '1',
        chainId: '0x1',
        type: '0x01',
        data: {
          types: {
            CustomMessage: [
              { name: 'text', type: 'string' },
              { name: 'number', type: 'uint256' },
            ],
          },
          domain: {
            name: 'Custom App',
            version: '1',
            chainId: 1,
            verifyingContract: '0x1111111111111111111111111111111111111111',
          },
          primaryType: 'CustomMessage',
          message: {
            text: 'Hello World',
            number: 42,
          },
        },
      };

      const encoded = encodeWalletSign(params);
      const decoded = decodeWalletSign(encoded, 1);

      expect(decoded.data.primaryType).toBe('CustomMessage');
      expect(decoded.data.message.text).toBe('Hello World');
      expect(decoded.data.message.number).toBe(42);
    });
  });

  describe('EIP-712 domain reconstruction', () => {
    // Per spec: Decoded EIP-712 must have proper types structure

    it('should reconstruct EIP712Domain types for SpendPermission', () => {
      const params = createSpendPermissionParams();
      const encoded = encodeWalletSign(params);
      const decoded = decodeWalletSign(encoded, 84532);

      // Verify EIP712Domain is included in types
      expect(decoded.data.types.EIP712Domain).toEqual([
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ]);

      // Verify SpendPermission types
      expect(decoded.data.types.SpendPermission).toEqual([
        { name: 'account', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'allowance', type: 'uint160' },
        { name: 'period', type: 'uint48' },
        { name: 'start', type: 'uint48' },
        { name: 'end', type: 'uint48' },
        { name: 'salt', type: 'uint256' },
        { name: 'extraData', type: 'bytes' },
      ]);
    });

    it('should reconstruct EIP712Domain types for ReceiveWithAuthorization', () => {
      const params = createReceiveWithAuthParams();
      const encoded = encodeWalletSign(params);
      const decoded = decodeWalletSign(encoded, 8453);

      expect(decoded.data.types.EIP712Domain).toBeDefined();
      expect(decoded.data.types.ReceiveWithAuthorization).toEqual([
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ]);
    });
  });

  describe('Capabilities handling', () => {
    it('should include capabilities in decoded params', () => {
      const params = createSpendPermissionParams();
      const capabilities = {
        dataCallback: {
          callbackURL: 'https://example.com/callback',
          events: [{ type: 'postSign' }],
        },
      };

      const encoded = encodeWalletSign(params);
      const decoded = decodeWalletSign(encoded, 84532, capabilities);

      expect(decoded.capabilities).toEqual(capabilities);
    });
  });
});

// Helper functions to create valid test params

function createValidSignParams(overrides: {
  type?: string | number;
  chainId?: string;
  domainChainId?: number;
}) {
  return {
    version: '1',
    chainId: overrides.chainId || '0x1',
    type: overrides.type,
    data: {
      types: {
        CustomType: [{ name: 'x', type: 'uint256' }],
      },
      domain: {
        name: 'Test',
        version: '1',
        chainId: overrides.domainChainId !== undefined ? overrides.domainChainId : 1,
        verifyingContract: '0x1111111111111111111111111111111111111111',
      },
      primaryType: 'CustomType',
      message: { x: 1 },
    },
  };
}

function createSpendPermissionParams() {
  return {
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
  };
}

function createReceiveWithAuthParams() {
  return {
    version: '1',
    chainId: '0x2105',
    type: '0x01',
    data: {
      types: {
        ReceiveWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      },
      domain: {
        name: 'USDC',
        version: '2',
        chainId: 8453,
        verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      primaryType: 'ReceiveWithAuthorization',
      message: {
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        value: '0x5f5e100',
        validAfter: '0x0',
        validBefore: '0xffffffffffffffff',
        nonce: '0x1234567890123456789012345678901234567890123456789012345678901234',
      },
    },
  };
}

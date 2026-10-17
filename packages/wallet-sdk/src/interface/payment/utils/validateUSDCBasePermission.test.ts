import { describe, expect, it } from 'vitest';
import type { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { CHAIN_IDS, TOKENS } from '../constants.js';
import { validateUSDCBasePermission } from './validateUSDCBasePermission.js';

describe('validateUSDCBasePermission', () => {
  const mockPermission: SpendPermission = {
    chainId: CHAIN_IDS.base,
    signature: '0x',
    permission: {
      token: TOKENS.USDC.addresses.base,
      account: '0x1234567890123456789012345678901234567890',
      spender: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      start: 0,
      end: 0,
      period: 0,
      allowance: '0',
      salt: '0',
      extraData: '0x',
    },
  };

  describe('mainnet validation (testnet=false)', () => {
    it('should pass validation for correct mainnet USDC permission', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.base,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.base,
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).not.toThrow();
    });

    it('should pass validation with lowercase token address on mainnet', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.base,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.base.toLowerCase(),
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).not.toThrow();
    });

    it('should pass validation with uppercase token address on mainnet', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.base,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.base.toUpperCase(),
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).not.toThrow();
    });

    it('should throw error when using testnet chainId on mainnet', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.baseSepolia,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.base,
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).toThrow(
        'The subscription was requested on mainnet but is actually a testnet subscription'
      );
    });

    it('should throw error when using wrong token on mainnet', () => {
      const wrongToken = '0x0000000000000000000000000000000000000001';
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.base,
        permission: {
          ...mockPermission.permission,
          token: wrongToken,
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).toThrow(
        `Subscription is not for USDC token. Got ${wrongToken}, expected ${TOKENS.USDC.addresses.base.toLowerCase()}`
      );
    });

    it('should throw error when using testnet USDC token on mainnet', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.base,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.baseSepolia,
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).toThrow(
        `Subscription is not for USDC token. Got ${TOKENS.USDC.addresses.baseSepolia}, expected ${TOKENS.USDC.addresses.base.toLowerCase()}`
      );
    });

    it('should throw error for unknown chainId on mainnet', () => {
      const unknownChainId = 1; // Ethereum mainnet
      const permission = {
        ...mockPermission,
        chainId: unknownChainId,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.base,
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).toThrow(
        `Subscription is on chain ${unknownChainId}, expected ${CHAIN_IDS.base} (Base)`
      );
    });
  });

  describe('testnet validation (testnet=true)', () => {
    it('should pass validation for correct testnet USDC permission', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.baseSepolia,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.baseSepolia,
        },
      };

      expect(() => validateUSDCBasePermission(permission, true)).not.toThrow();
    });

    it('should pass validation with lowercase token address on testnet', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.baseSepolia,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.baseSepolia.toLowerCase(),
        },
      };

      expect(() => validateUSDCBasePermission(permission, true)).not.toThrow();
    });

    it('should pass validation with uppercase token address on testnet', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.baseSepolia,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.baseSepolia.toUpperCase(),
        },
      };

      expect(() => validateUSDCBasePermission(permission, true)).not.toThrow();
    });

    it('should throw error when using mainnet chainId on testnet', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.base,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.baseSepolia,
        },
      };

      expect(() => validateUSDCBasePermission(permission, true)).toThrow(
        'The subscription was requested on testnet but is actually a mainnet subscription'
      );
    });

    it('should throw error when using wrong token on testnet', () => {
      const wrongToken = '0x0000000000000000000000000000000000000001';
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.baseSepolia,
        permission: {
          ...mockPermission.permission,
          token: wrongToken,
        },
      };

      expect(() => validateUSDCBasePermission(permission, true)).toThrow(
        `Subscription is not for USDC token. Got ${wrongToken}, expected ${TOKENS.USDC.addresses.baseSepolia.toLowerCase()}`
      );
    });

    it('should throw error when using mainnet USDC token on testnet', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.baseSepolia,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.base,
        },
      };

      expect(() => validateUSDCBasePermission(permission, true)).toThrow(
        `Subscription is not for USDC token. Got ${TOKENS.USDC.addresses.base}, expected ${TOKENS.USDC.addresses.baseSepolia.toLowerCase()}`
      );
    });

    it('should throw error for unknown chainId on testnet', () => {
      const unknownChainId = 11155111; // Ethereum Sepolia
      const permission = {
        ...mockPermission,
        chainId: unknownChainId,
        permission: {
          ...mockPermission.permission,
          token: TOKENS.USDC.addresses.baseSepolia,
        },
      };

      expect(() => validateUSDCBasePermission(permission, true)).toThrow(
        `Subscription is on chain ${unknownChainId}, expected ${CHAIN_IDS.baseSepolia} (Base Sepolia)`
      );
    });
  });

  describe('case-insensitive token address comparison', () => {
    it('should handle mixed case addresses on mainnet', () => {
      const mixedCaseAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Mixed case
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.base,
        permission: {
          ...mockPermission.permission,
          token: mixedCaseAddress,
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).not.toThrow();
    });

    it('should handle mixed case addresses on testnet', () => {
      const mixedCaseAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Mixed case
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.baseSepolia,
        permission: {
          ...mockPermission.permission,
          token: mixedCaseAddress,
        },
      };

      expect(() => validateUSDCBasePermission(permission, true)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle all lowercase USDC mainnet address', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.base,
        permission: {
          ...mockPermission.permission,
          token: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).not.toThrow();
    });

    it('should handle all uppercase USDC mainnet address', () => {
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.base,
        permission: {
          ...mockPermission.permission,
          token: '0X833589FCD6EDB6E08F4C7C32D4F71B54BDA02913',
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).not.toThrow();
    });

    it('should handle address without 0x prefix validation', () => {
      // Note: This test checks what happens if someone passes an invalid address format
      // The function compares lowercase versions, so this would fail
      const permission = {
        ...mockPermission,
        chainId: CHAIN_IDS.base,
        permission: {
          ...mockPermission.permission,
          token: '833589fcd6edb6e08f4c7c32d4f71b54bda02913', // No 0x prefix
        },
      };

      expect(() => validateUSDCBasePermission(permission, false)).toThrow(
        'Subscription is not for USDC token'
      );
    });
  });
});

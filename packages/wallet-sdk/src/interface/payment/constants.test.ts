import { describe, expect, it } from 'vitest';
import { CHAIN_IDS, TOKENS } from './constants.js';

describe('constants', () => {
  describe('TOKENS', () => {
    it('should have correct USDC configuration', () => {
      expect(TOKENS.USDC.decimals).toBe(6);
      expect(TOKENS.USDC.addresses.base).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
      expect(TOKENS.USDC.addresses.baseSepolia).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    });
  });

  describe('CHAIN_IDS', () => {
    it('should have correct chain IDs', () => {
      expect(CHAIN_IDS.base).toBe(8453);
      expect(CHAIN_IDS.baseSepolia).toBe(84532);
    });
  });
});

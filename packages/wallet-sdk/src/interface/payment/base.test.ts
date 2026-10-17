import { describe, expect, it } from 'vitest';
import { base } from './base.js';
import { CHAIN_IDS, TOKENS } from './constants.js';

describe('base', () => {
  it('should export pay function', () => {
    expect(base.pay).toBeDefined();
    expect(typeof base.pay).toBe('function');
  });

  it('should export getPaymentStatus function', () => {
    expect(base.getPaymentStatus).toBeDefined();
    expect(typeof base.getPaymentStatus).toBe('function');
  });

  it('should export constants', () => {
    expect(base.constants).toBeDefined();
    expect(base.constants.CHAIN_IDS).toEqual(CHAIN_IDS);
    expect(base.constants.TOKENS).toEqual(TOKENS);
  });

  it('should have expected structure', () => {
    expect(base).toHaveProperty('pay');
    expect(base).toHaveProperty('getPaymentStatus');
    expect(base).toHaveProperty('constants');
    expect(base.constants).toHaveProperty('CHAIN_IDS');
    expect(base.constants).toHaveProperty('TOKENS');
  });
});

import { describe, expect, it } from 'vitest';
import { normalizeAddress, validateStringAmount } from './validation.js';

describe('validateStringAmount', () => {
  it('should validate valid amounts', () => {
    expect(() => validateStringAmount('10.50', 6)).not.toThrow();
    expect(() => validateStringAmount('0.01', 6)).not.toThrow();
    expect(() => validateStringAmount('1000', 6)).not.toThrow();
    expect(() => validateStringAmount('1.2', 6)).not.toThrow();
    expect(() => validateStringAmount('10.123456', 6)).not.toThrow();
    expect(() => validateStringAmount('0.000001', 6)).not.toThrow();
  });

  it('should reject invalid amounts', () => {
    expect(() => validateStringAmount('0', 6)).toThrow('Invalid amount: must be greater than 0');
    expect(() => validateStringAmount('-10', 6)).toThrow('Invalid amount: must be greater than 0');
    expect(() => validateStringAmount('abc', 6)).toThrow('Invalid amount: must be a valid number');
    expect(() => validateStringAmount('10.1234567', 6)).toThrow(
      'Invalid amount: pay only supports up to 6 decimal places'
    );
  });

  it('should reject non-string amounts', () => {
    expect(() => validateStringAmount(10 as any, 6)).toThrow('Invalid amount: must be a string');
  });

  it('should validate amounts with exactly 6 decimal places', () => {
    expect(() => validateStringAmount('1.123456', 6)).not.toThrow();
    expect(() => validateStringAmount('999.999999', 6)).not.toThrow();
    expect(() => validateStringAmount('0.100000', 6)).not.toThrow();
  });

  it('should validate amounts with fewer than 6 decimal places', () => {
    expect(() => validateStringAmount('1.1', 6)).not.toThrow();
    expect(() => validateStringAmount('1.12', 6)).not.toThrow();
    expect(() => validateStringAmount('1.123', 6)).not.toThrow();
    expect(() => validateStringAmount('1.1234', 6)).not.toThrow();
    expect(() => validateStringAmount('1.12345', 6)).not.toThrow();
  });
});

describe('normalizeAddress', () => {
  it('should throw error for empty address', () => {
    expect(() => normalizeAddress('')).toThrow('Invalid address: address is required');
  });

  it('should throw error for invalid address', () => {
    expect(() => normalizeAddress('not-an-address')).toThrow(
      'Invalid address: must be a valid Ethereum address'
    );
    expect(() => normalizeAddress('0x123')).toThrow(
      'Invalid address: must be a valid Ethereum address'
    );
  });

  it('should accept and return checksummed address for valid checksummed address', () => {
    const checksummedAddress = '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51';
    const result = normalizeAddress(checksummedAddress);
    expect(result).toBe(checksummedAddress);
  });

  it('should accept non-checksummed address and return checksummed version', () => {
    const nonChecksummedAddress = '0xfe21034794a5a574b94fe4fdfd16e005f1c96e51';
    const expectedChecksummed = '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51';
    const result = normalizeAddress(nonChecksummedAddress);
    expect(result).toBe(expectedChecksummed);
  });

  it('should accept all uppercase address and return checksummed version', () => {
    const upperCaseAddress = '0xFE21034794A5A574B94FE4FDFD16E005F1C96E51';
    const expectedChecksummed = '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51';
    const result = normalizeAddress(upperCaseAddress);
    expect(result).toBe(expectedChecksummed);
  });

  it('should accept mixed case non-checksummed address and return checksummed version', () => {
    const mixedCaseAddress = '0xfE21034794a5A574b94fe4FDfD16E005f1C96e51';
    const expectedChecksummed = '0xFe21034794A5a574B94fE4fDfD16e005F1C96e51';
    const result = normalizeAddress(mixedCaseAddress);
    expect(result).toBe(expectedChecksummed);
  });
});

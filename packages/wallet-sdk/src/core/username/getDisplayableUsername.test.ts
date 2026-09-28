import { Address } from 'viem';
import { getDisplayableUsername } from './getDisplayableUsername.js';

describe('getDisplayableUsername', () => {
  const testAddress: Address = '0x1234567890123456789012345678901234567890';

  describe('getDisplayableUsername', () => {
    test('returns truncated address with default length', async () => {
      const result = await getDisplayableUsername(testAddress);
      expect(result).toBe('0x1234...7890');
    });

    test('handles mixed case addresses', async () => {
      const mixedCaseAddress: Address = '0xAbCdEf1234567890123456789012345678901234';
      const result = await getDisplayableUsername(mixedCaseAddress);
      expect(result).toBe('0xAbCd...1234');
    });
  });

  describe('truncateAddress (internal function)', () => {
    // Since truncateAddress is not exported, we test it through getDisplayableUsername
    // but we can also test it directly by importing it or making it available for testing

    test('with default length (4)', async () => {
      const result = await getDisplayableUsername(testAddress);
      expect(result).toBe('0x1234...7890');
      expect(result).toHaveLength(13); // '0x' + 4 chars + '...' + 4 chars
    });

    test('preserves 0x prefix', async () => {
      const result = await getDisplayableUsername(testAddress);
      expect(result).toMatch(/^0x/);
    });

    test('contains ellipsis in the middle', async () => {
      const result = await getDisplayableUsername(testAddress);
      expect(result).toContain('...');
    });

    test('format is correct', async () => {
      const result = await getDisplayableUsername(testAddress);
      expect(result).toMatch(/^0x[\da-fA-F]{4}\.\.\.[\da-fA-F]{4}$/);
    });
  });
});

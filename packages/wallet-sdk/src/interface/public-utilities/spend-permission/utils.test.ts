import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestSpendPermissionType } from './methods/requestSpendPermission.js';
import {
  createSpendPermissionTypedData,
  dateToTimestampInSeconds,
  timestampInSecondsToDate,
  toSpendPermissionArgs,
} from './utils.js';

const ETERNITY_TIMESTAMP = 281474976710655; // 2^48 - 1

describe('createSpendPermissionTypedData', () => {
  const mockCurrentDate = new Date('2022-01-01T00:00:00.000Z');
  const mockCurrentTimestamp = 1640995200; // 2022-01-01 00:00:00 UTC in seconds
  let OriginalDate: DateConstructor;

  beforeEach(() => {
    // Store original Date constructor
    OriginalDate = global.Date;

    // Mock crypto.getRandomValues for consistent testing
    const mockGetRandomValues = vi.fn((array: Uint8Array) => {
      // Fill with deterministic values for testing
      for (let i = 0; i < array.length; i++) {
        array[i] = 0xab;
      }
      return array;
    });

    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: mockGetRandomValues,
      },
      writable: true,
    });

    // Mock Date constructor to return our mock date when called without arguments
    vi.spyOn(global, 'Date').mockImplementation(((...args: any[]) => {
      if (args.length === 0) {
        return mockCurrentDate;
      }
      return new OriginalDate(...(args as [string | number | Date]));
    }) as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const baseRequest: RequestSpendPermissionType = {
    account: '0x1234567890123456789012345678901234567890',
    spender: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Valid checksummed address
    token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: 8453,
    allowance: BigInt('1000000000000000000'), // 1 ETH in wei
    periodInDays: 30,
  };

  it('should generate valid EIP-712 typed data with all required fields', () => {
    const result = createSpendPermissionTypedData(baseRequest);

    expect(result).toEqual({
      domain: {
        name: 'Spend Permission Manager',
        version: '1',
        chainId: 8453,
        verifyingContract: '0xf85210B21cC50302F477BA56686d2019dC9b67Ad',
      },
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
      primaryType: 'SpendPermission',
      message: {
        account: '0x1234567890123456789012345678901234567890',
        spender: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        allowance: '1000000000000000000',
        period: 86400 * 30, // 30 days in seconds
        start: mockCurrentTimestamp, // dateToTimestampInSeconds(new Date())
        end: ETERNITY_TIMESTAMP, // ETERNITY_TIMESTAMP when end is not specified
        salt: '0xabababababababababababababababababababababababababababababababab',
        extraData: '0x',
      },
    });
  });

  it('should use provided optional parameters when specified', () => {
    const startDate = new Date('2020-01-01T00:00:00.000Z');
    const endDate = new Date('2021-01-01T00:00:00.000Z');
    const startTimestamp = 1577836800; // 2020-01-01 00:00:00 UTC in seconds
    const endTimestamp = 1609459200; // 2021-01-01 00:00:00 UTC in seconds

    const requestWithOptionals: RequestSpendPermissionType = {
      ...baseRequest,
      start: startDate,
      end: endDate,
      salt: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      extraData: '0xdeadbeef',
    };

    const result = createSpendPermissionTypedData(requestWithOptionals);

    expect(result.message.start).toBe(startTimestamp);
    expect(result.message.end).toBe(endTimestamp);
    expect(result.message.salt).toBe(
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    );
    expect(result.message.extraData).toBe('0xdeadbeef');
  });

  it('should convert period in days to seconds correctly', () => {
    const requestWith7Days: RequestSpendPermissionType = {
      ...baseRequest,
      periodInDays: 7,
    };

    const result = createSpendPermissionTypedData(requestWith7Days);
    expect(result.message.period).toBe(86400 * 7); // 7 days in seconds
  });

  it('should convert allowance bigint to string', () => {
    const requestWithLargeAllowance: RequestSpendPermissionType = {
      ...baseRequest,
      allowance: BigInt('999999999999999999999999999'), // Very large number
    };

    const result = createSpendPermissionTypedData(requestWithLargeAllowance);
    expect(result.message.allowance).toBe('999999999999999999999999999');
    expect(typeof result.message.allowance).toBe('string');
  });

  it('should generate different salts for different calls when salt is not provided', () => {
    // Clear the mock and set up different return values
    vi.clearAllMocks();

    let callCount = 0;
    const mockGetRandomValues = vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = callCount + i; // Different values for each call
      }
      callCount++;
      return array;
    });

    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: mockGetRandomValues,
      },
      writable: true,
    });

    const result1 = createSpendPermissionTypedData(baseRequest);
    const result2 = createSpendPermissionTypedData(baseRequest);

    expect(result1.message.salt).not.toBe(result2.message.salt);
    expect(mockGetRandomValues).toHaveBeenCalledTimes(2);
  });

  it('should use current timestamp for start when not provided', () => {
    const result = createSpendPermissionTypedData(baseRequest);
    expect(result.message.start).toBe(mockCurrentTimestamp);
  });

  it('should use ETERNITY_TIMESTAMP for end when not provided', () => {
    const result = createSpendPermissionTypedData(baseRequest);
    expect(result.message.end).toBe(ETERNITY_TIMESTAMP);
  });

  it('should use empty hex string for extraData when not provided', () => {
    const result = createSpendPermissionTypedData(baseRequest);
    expect(result.message.extraData).toBe('0x');
  });

  it('should have correct EIP-712 domain structure', () => {
    const result = createSpendPermissionTypedData(baseRequest);

    expect(result.domain).toEqual({
      name: 'Spend Permission Manager',
      version: '1',
      chainId: baseRequest.chainId,
      verifyingContract: '0xf85210B21cC50302F477BA56686d2019dC9b67Ad',
    });
  });

  it('should have correct EIP-712 types structure', () => {
    const result = createSpendPermissionTypedData(baseRequest);

    expect(result.types.SpendPermission).toHaveLength(9);
    expect(result.types.SpendPermission).toContainEqual({ name: 'account', type: 'address' });
    expect(result.types.SpendPermission).toContainEqual({ name: 'spender', type: 'address' });
    expect(result.types.SpendPermission).toContainEqual({ name: 'token', type: 'address' });
    expect(result.types.SpendPermission).toContainEqual({ name: 'allowance', type: 'uint160' });
    expect(result.types.SpendPermission).toContainEqual({ name: 'period', type: 'uint48' });
    expect(result.types.SpendPermission).toContainEqual({ name: 'start', type: 'uint48' });
    expect(result.types.SpendPermission).toContainEqual({ name: 'end', type: 'uint48' });
    expect(result.types.SpendPermission).toContainEqual({ name: 'salt', type: 'uint256' });
    expect(result.types.SpendPermission).toContainEqual({ name: 'extraData', type: 'bytes' });
  });

  it('should have correct SpendPermission field order for EIP-712 compatibility', () => {
    const result = createSpendPermissionTypedData(baseRequest);

    // Field order is crucial for EIP-712 hash calculation and must match smart contract expectations
    const expectedFieldOrder = [
      { name: 'account', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'allowance', type: 'uint160' },
      { name: 'period', type: 'uint48' },
      { name: 'start', type: 'uint48' },
      { name: 'end', type: 'uint48' },
      { name: 'salt', type: 'uint256' },
      { name: 'extraData', type: 'bytes' },
    ];

    expect(result.types.SpendPermission).toEqual(expectedFieldOrder);

    // Verify each field is in the exact expected position
    expect(result.types.SpendPermission[0]).toEqual({ name: 'account', type: 'address' });
    expect(result.types.SpendPermission[1]).toEqual({ name: 'spender', type: 'address' });
    expect(result.types.SpendPermission[2]).toEqual({ name: 'token', type: 'address' });
    expect(result.types.SpendPermission[3]).toEqual({ name: 'allowance', type: 'uint160' });
    expect(result.types.SpendPermission[4]).toEqual({ name: 'period', type: 'uint48' });
    expect(result.types.SpendPermission[5]).toEqual({ name: 'start', type: 'uint48' });
    expect(result.types.SpendPermission[6]).toEqual({ name: 'end', type: 'uint48' });
    expect(result.types.SpendPermission[7]).toEqual({ name: 'salt', type: 'uint256' });
    expect(result.types.SpendPermission[8]).toEqual({ name: 'extraData', type: 'bytes' });
  });
});

describe('dateToTimestampInSeconds', () => {
  it('should convert Date to Unix timestamp in seconds', () => {
    const date = new Date('2022-01-01T00:00:00.000Z');
    const result = dateToTimestampInSeconds(date);
    expect(result).toBe(1640995200); // 2022-01-01 00:00:00 UTC in seconds
  });

  it('should handle different dates correctly', () => {
    const testCases = [
      { date: new Date('2020-01-01T00:00:00.000Z'), expected: 1577836800 },
      { date: new Date('2021-12-31T23:59:59.999Z'), expected: 1640995199 },
      { date: new Date('1970-01-01T00:00:00.000Z'), expected: 0 },
    ];

    testCases.forEach(({ date, expected }) => {
      const result = dateToTimestampInSeconds(date);
      expect(result).toBe(expected);
    });
  });

  it('should floor the result to remove milliseconds', () => {
    const date = new Date('2022-01-01T00:00:00.999Z'); // 999ms
    const result = dateToTimestampInSeconds(date);
    expect(result).toBe(1640995200); // Should be floored to seconds
  });
});

describe('toSpendPermissionArgs', () => {
  const mockSpendPermission: SpendPermission = {
    createdAt: 1234567890,
    permissionHash: '0xabcdef123456',
    signature: '0x987654321fedcba',
    chainId: 8453,
    permission: {
      account: '0x1234567890abcdef1234567890abcdef12345678',
      spender: '0x5678901234567890abcdef1234567890abcdef12',
      token: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      allowance: '1000000000000000000',
      period: 86400,
      start: 1234567890,
      end: 1234654290,
      salt: '123456789',
      extraData: '0x',
    },
  };

  it('should convert SpendPermission to contract args with proper types', () => {
    const result = toSpendPermissionArgs(mockSpendPermission);

    expect(result).toEqual({
      account: '0x1234567890AbcdEF1234567890aBcdef12345678', // checksummed by viem
      spender: '0x5678901234567890abCDEf1234567890ABcDef12', // checksummed by viem
      token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // checksummed by viem
      allowance: BigInt('1000000000000000000'),
      period: 86400,
      start: 1234567890,
      end: 1234654290,
      salt: BigInt('123456789'),
      extraData: '0x',
    });
  });

  it('should handle different address formats and checksum them', () => {
    const permission: SpendPermission = {
      ...mockSpendPermission,
      permission: {
        ...mockSpendPermission.permission,
        account: '0xabc123abc123abc123abc123abc123abc123abc1', // lowercase
        spender: '0xDEF456DEF456DEF456DEF456DEF456DEF456DEF4', // uppercase
        token: '0x1234567890123456789012345678901234567890', // valid mixed case
      },
    };

    const result = toSpendPermissionArgs(permission);

    // Should be checksummed by viem's getAddress - verify they're proper addresses
    expect(result.account).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(result.spender).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(result.token).toMatch(/^0x[a-fA-F0-9]{40}$/);

    // Verify the addresses are properly checksummed (not all lowercase/uppercase)
    expect(result.account).not.toBe(permission.permission.account.toLowerCase());
    expect(result.spender).not.toBe(permission.permission.spender.toLowerCase());

    // Check specific values that viem produces
    expect(result.account).toBe('0xAbc123AbC123Abc123aBc123abC123ABC123ABc1');
    expect(result.spender).toBe('0xDEF456Def456deF456dEF456DEF456DeF456Def4');
    expect(result.token).toBe('0x1234567890123456789012345678901234567890');
  });

  it('should convert large number strings to BigInt correctly', () => {
    const permission: SpendPermission = {
      ...mockSpendPermission,
      permission: {
        ...mockSpendPermission.permission,
        allowance: '999999999999999999999999999999', // Very large number
        salt: '18446744073709551615', // Max uint64
      },
    };

    const result = toSpendPermissionArgs(permission);

    expect(result.allowance).toBe(BigInt('999999999999999999999999999999'));
    expect(result.salt).toBe(BigInt('18446744073709551615'));
  });

  it('should handle zero values correctly', () => {
    const permission: SpendPermission = {
      ...mockSpendPermission,
      permission: {
        ...mockSpendPermission.permission,
        allowance: '0',
        salt: '0',
        period: 0,
        start: 0,
        end: 0,
      },
    };

    const result = toSpendPermissionArgs(permission);

    expect(result.allowance).toBe(BigInt(0));
    expect(result.salt).toBe(BigInt(0));
    expect(result.period).toBe(0);
    expect(result.start).toBe(0);
    expect(result.end).toBe(0);
  });

  it('should handle hex extraData correctly', () => {
    const permission: SpendPermission = {
      ...mockSpendPermission,
      permission: {
        ...mockSpendPermission.permission,
        extraData: '0x1234abcd',
      },
    };

    const result = toSpendPermissionArgs(permission);

    expect(result.extraData).toBe('0x1234abcd');
  });

  it('should preserve all fields from the original permission', () => {
    const result = toSpendPermissionArgs(mockSpendPermission);

    // Should have all the fields from the original permission
    expect(Object.keys(result)).toEqual([
      'account',
      'spender',
      'token',
      'allowance',
      'period',
      'start',
      'end',
      'salt',
      'extraData',
    ]);
  });

  it('should preserve the order of the fields', () => {
    const result = toSpendPermissionArgs(mockSpendPermission);
    expect(Object.keys(result)).toEqual([
      'account',
      'spender',
      'token',
      'allowance',
      'period',
      'start',
      'end',
      'salt',
      'extraData',
    ]);
  });
});

describe('timestampInSecondsToDate', () => {
  it('should convert Unix timestamp in seconds to Date object', () => {
    const timestamp = 1640995200; // 2022-01-01 00:00:00 UTC
    const result = timestampInSecondsToDate(timestamp);
    expect(result).toEqual(new Date('2022-01-01T00:00:00.000Z'));
  });

  it('should handle different timestamps correctly', () => {
    const testCases = [
      { timestamp: 1577836800, expected: new Date('2020-01-01T00:00:00.000Z') },
      { timestamp: 1640995199, expected: new Date('2021-12-31T23:59:59.000Z') },
      { timestamp: 0, expected: new Date('1970-01-01T00:00:00.000Z') },
      { timestamp: 2147483647, expected: new Date('2038-01-19T03:14:07.000Z') }, // Max 32-bit timestamp
    ];

    testCases.forEach(({ timestamp, expected }) => {
      const result = timestampInSecondsToDate(timestamp);
      expect(result).toEqual(expected);
    });
  });

  it('should handle negative timestamps for dates before Unix epoch', () => {
    const timestamp = -86400; // One day before Unix epoch
    const result = timestampInSecondsToDate(timestamp);
    expect(result).toEqual(new Date('1969-12-31T00:00:00.000Z'));
  });

  it('should handle very large timestamps correctly', () => {
    const timestamp = 4102444800; // 2100-01-01 00:00:00 UTC
    const result = timestampInSecondsToDate(timestamp);
    expect(result).toEqual(new Date('2100-01-01T00:00:00.000Z'));
  });

  it('should be the inverse of dateToTimestampInSeconds', () => {
    const originalDate = new Date('2022-06-15T12:30:45.123Z');
    const timestamp = dateToTimestampInSeconds(originalDate);
    const resultDate = timestampInSecondsToDate(timestamp);

    // Note: We lose millisecond precision in the conversion
    const expectedDate = new Date('2022-06-15T12:30:45.000Z');
    expect(resultDate).toEqual(expectedDate);
  });

  it('should handle decimal timestamps by truncating to integer', () => {
    const timestamp = 1640995200.999; // Decimal timestamp
    const result = timestampInSecondsToDate(timestamp);
    expect(result).toEqual(new Date('2022-01-01T00:00:00.999Z'));
  });
});

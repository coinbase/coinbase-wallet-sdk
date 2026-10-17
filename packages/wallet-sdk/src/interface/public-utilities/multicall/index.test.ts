import { type PublicClient, createPublicClient, http } from 'viem';
import { multicall as viemMulticall } from 'viem/actions';
import { base } from 'viem/chains';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isMulticallFailure,
  isMulticallSuccess,
  multicall,
  unwrapMulticallResults,
} from './index.js';

vi.mock('viem/actions', () => ({
  multicall: vi.fn(),
}));

describe('multicall', () => {
  let mockClient: PublicClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createPublicClient({
      chain: base,
      transport: http(),
    }) as PublicClient;
  });

  describe('basic functionality', () => {
    it('should successfully execute multiple contract calls', async () => {
      const mockResults = [
        { status: 'success' as const, result: BigInt(1000) },
        { status: 'success' as const, result: true },
        { status: 'success' as const, result: '0x123' },
      ];

      (viemMulticall as Mock).mockResolvedValue(mockResults);

      const contracts = [
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'balanceOf',
          args: ['0xabc'],
        },
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'isActive',
        },
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'getAddress',
        },
      ];

      const results = await multicall(mockClient, { contracts });

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ status: 'success', result: BigInt(1000) });
      expect(results[1]).toEqual({ status: 'success', result: true });
      expect(results[2]).toEqual({ status: 'success', result: '0x123' });
      expect(viemMulticall).toHaveBeenCalledWith(mockClient, { contracts });
    });

    it('should batch all calls into a single multicall', async () => {
      const mockResults = [
        { status: 'success' as const, result: 'result1' },
        { status: 'success' as const, result: 'result2' },
      ];

      (viemMulticall as Mock).mockResolvedValue(mockResults);

      const contracts = [
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'func1',
        },
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'func2',
        },
      ];

      await multicall(mockClient, { contracts });

      // Verify only one call to viem multicall
      expect(viemMulticall).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should throw when client is not provided', async () => {
      await expect(
        multicall(null as any, {
          contracts: [
            {
              address: '0x1234567890123456789012345678901234567890' as const,
              abi: [],
              functionName: 'test',
            },
          ],
        })
      ).rejects.toThrow('Public client is required for multicall');
    });

    it('should throw when contracts array is empty', async () => {
      await expect(multicall(mockClient, { contracts: [] })).rejects.toThrow(
        'At least one contract call is required'
      );
    });

    it('should throw when contracts is not provided', async () => {
      await expect(multicall(mockClient, { contracts: undefined as any })).rejects.toThrow(
        'At least one contract call is required'
      );
    });

    it('should throw by default when a call fails', async () => {
      const mockResults = [
        { status: 'success' as const, result: 'success1' },
        { status: 'failure' as const, error: new Error('Call failed') },
      ];

      (viemMulticall as Mock).mockResolvedValue(mockResults);

      const contracts = [
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'func1',
        },
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'func2',
        },
      ];

      await expect(multicall(mockClient, { contracts })).rejects.toThrow('Contract call 1 failed');
    });

    it('should use custom error messages when provided', async () => {
      const mockResults = [{ status: 'failure' as const, error: new Error('Call failed') }];

      (viemMulticall as Mock).mockResolvedValue(mockResults);

      const contracts = [
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'func1',
        },
      ];

      await expect(
        multicall(mockClient, {
          contracts,
          errorMessages: ['Custom error message'],
        })
      ).rejects.toThrow('Custom error message');
    });

    it('should wrap unexpected errors', async () => {
      (viemMulticall as Mock).mockRejectedValue(new Error('Network error'));

      const contracts = [
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'func1',
        },
      ];

      await expect(multicall(mockClient, { contracts })).rejects.toThrow(
        'Multicall execution failed: Network error'
      );
    });
  });

  describe('partial failure handling', () => {
    it('should return failure results when allowPartialFailure is true', async () => {
      const mockResults = [
        { status: 'success' as const, result: 'success1' },
        { status: 'failure' as const, error: new Error('Call failed') },
        { status: 'success' as const, result: 'success2' },
      ];

      (viemMulticall as Mock).mockResolvedValue(mockResults);

      const contracts = [
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'func1',
        },
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'func2',
        },
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'func3',
        },
      ];

      const results = await multicall(mockClient, {
        contracts,
        allowPartialFailure: true,
      });

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ status: 'success', result: 'success1' });
      expect(results[1].status).toBe('failure');
      expect((results[1] as any).error).toBeInstanceOf(Error);
      expect(results[2]).toEqual({ status: 'success', result: 'success2' });
    });

    it('should use custom error messages with partial failures', async () => {
      const mockResults = [{ status: 'failure' as const, error: new Error('Call failed') }];

      (viemMulticall as Mock).mockResolvedValue(mockResults);

      const contracts = [
        {
          address: '0x1234567890123456789012345678901234567890' as const,
          abi: [],
          functionName: 'func1',
        },
      ];

      const results = await multicall(mockClient, {
        contracts,
        allowPartialFailure: true,
        errorMessages: ['Failed to fetch data'],
      });

      expect(results[0].status).toBe('failure');
      expect((results[0] as any).error.message).toBe('Failed to fetch data');
    });
  });
});

describe('unwrapMulticallResults', () => {
  it('should unwrap successful results', () => {
    const results = [
      { status: 'success' as const, result: BigInt(100) },
      { status: 'success' as const, result: true },
      { status: 'success' as const, result: '0xabc' },
    ];

    const unwrapped = unwrapMulticallResults(results);

    expect(unwrapped).toEqual([BigInt(100), true, '0xabc']);
  });

  it('should throw when encountering a failure', () => {
    const results = [
      { status: 'success' as const, result: 'success' },
      { status: 'failure' as const, error: new Error('Failed') },
    ];

    expect(() => unwrapMulticallResults(results)).toThrow('Failed');
  });

  it('should use custom error messages', () => {
    const results = [{ status: 'failure' as const, error: new Error('Original error') }];

    expect(() => unwrapMulticallResults(results, ['Custom error message'])).toThrow(
      'Custom error message'
    );
  });

  it('should handle missing error messages', () => {
    const results = [{ status: 'failure' as const, error: new Error('Original error') }];

    expect(() => unwrapMulticallResults(results)).toThrow('Original error');
  });

  it('should handle empty results', () => {
    const results: any[] = [];
    const unwrapped = unwrapMulticallResults(results);
    expect(unwrapped).toEqual([]);
  });
});

describe('type guards', () => {
  describe('isMulticallSuccess', () => {
    it('should return true for successful results', () => {
      const result = { status: 'success' as const, result: 'test' };
      expect(isMulticallSuccess(result)).toBe(true);
    });

    it('should return false for failed results', () => {
      const result = { status: 'failure' as const, error: new Error('Failed') };
      expect(isMulticallSuccess(result)).toBe(false);
    });

    it('should work with filter', () => {
      const results = [
        { status: 'success' as const, result: 'success1' },
        { status: 'failure' as const, error: new Error('Failed') },
        { status: 'success' as const, result: 'success2' },
      ];

      const successes = results.filter(isMulticallSuccess);
      expect(successes).toHaveLength(2);
      expect(successes[0].result).toBe('success1');
      expect(successes[1].result).toBe('success2');
    });
  });

  describe('isMulticallFailure', () => {
    it('should return true for failed results', () => {
      const result = { status: 'failure' as const, error: new Error('Failed') };
      expect(isMulticallFailure(result)).toBe(true);
    });

    it('should return false for successful results', () => {
      const result = { status: 'success' as const, result: 'test' };
      expect(isMulticallFailure(result)).toBe(false);
    });

    it('should work with filter', () => {
      const results = [
        { status: 'success' as const, result: 'success1' },
        { status: 'failure' as const, error: new Error('Failed1') },
        { status: 'failure' as const, error: new Error('Failed2') },
      ];

      const failures = results.filter(isMulticallFailure);
      expect(failures).toHaveLength(2);
      expect(failures[0].error.message).toBe('Failed1');
      expect(failures[1].error.message).toBe('Failed2');
    });
  });
});

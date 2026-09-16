import { ProviderInterface } from ':core/provider/interface.js';
import {
  FetchPermissionsResponse,
  SpendPermission,
} from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPermissions } from './fetchPermissions.js';

describe('fetchPermissions', () => {
  let mockProvider: ProviderInterface;
  let mockRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = vi.fn();
    mockProvider = {
      request: mockRequest,
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      removeAllListeners: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn(),
      listeners: vi.fn(),
      rawListeners: vi.fn(),
      listenerCount: vi.fn(),
      eventNames: vi.fn(),
      prependListener: vi.fn(),
      prependOnceListener: vi.fn(),
    } as ProviderInterface;
  });

  describe('successful requests', () => {
    it('should fetch permissions successfully', async () => {
      const mockPermissions: SpendPermission[] = [
        {
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
        },
        {
          createdAt: 1234567900,
          permissionHash: '0xfedcba654321',
          signature: '0xabcdef987654321',
          chainId: 8453,
          permission: {
            account: '0x1234567890abcdef1234567890abcdef12345678',
            spender: '0x5678901234567890abcdef1234567890abcdef12',
            token: '0xa0b86a33e6ba1a1c7b8eb56c1b8b5a7b34d5f0c8',
            allowance: '500000000000000000',
            period: 3600,
            start: 1234567900,
            end: 1234571500,
            salt: '987654321',
            extraData: '0x1234',
          },
        },
      ];

      const mockResponse: FetchPermissionsResponse = {
        permissions: mockPermissions,
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await fetchPermissions({
        account: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 8453,
        spender: '0x5678901234567890abcdef1234567890abcdef12',
        provider: mockProvider,
      });

      expect(result).toEqual(mockPermissions);
      expect(result).toHaveLength(2);
      expect(result[0].permission.account).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(result[1].permission.spender).toBe('0x5678901234567890abcdef1234567890abcdef12');
    });

    it('should return empty array when no permissions exist', async () => {
      const mockResponse: FetchPermissionsResponse = {
        permissions: [],
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await fetchPermissions({
        account: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 8453,
        spender: '0x5678901234567890abcdef1234567890abcdef12',
        provider: mockProvider,
      });

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('parameter handling', () => {
    it('should convert chainId to hex format correctly', async () => {
      const mockResponse: FetchPermissionsResponse = {
        permissions: [],
      };

      mockRequest.mockResolvedValue(mockResponse);

      // Test different chainIds
      const testCases = [
        { input: 1, expected: '0x1' },
        { input: 8453, expected: '0x2105' },
        { input: 137, expected: '0x89' },
        { input: 42161, expected: '0xa4b1' },
      ];

      for (const testCase of testCases) {
        mockRequest.mockClear();

        await fetchPermissions({
          account: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: testCase.input,
          spender: '0x5678901234567890abcdef1234567890abcdef12',
          provider: mockProvider,
        });

        expect(mockRequest).toHaveBeenCalledWith({
          method: 'coinbase_fetchPermissions',
          params: [
            {
              account: '0x1234567890abcdef1234567890abcdef12345678',
              chainId: testCase.expected,
              spender: '0x5678901234567890abcdef1234567890abcdef12',
            },
          ],
        });
      }
    });
  });

  describe('error handling', () => {
    it('should propagate provider errors', async () => {
      const errorMessage = 'Network error';
      mockRequest.mockRejectedValue(new Error(errorMessage));

      await expect(
        fetchPermissions({
          account: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: 8453,
          spender: '0x5678901234567890abcdef1234567890abcdef12',
          provider: mockProvider,
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should handle RPC errors', async () => {
      mockRequest.mockRejectedValue({
        code: -32603,
        message: 'Internal error',
      });

      await expect(
        fetchPermissions({
          account: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: 8453,
          spender: '0x5678901234567890abcdef1234567890abcdef12',
          provider: mockProvider,
        })
      ).rejects.toEqual({
        code: -32603,
        message: 'Internal error',
      });
    });
  });
});

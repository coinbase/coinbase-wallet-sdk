import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { ProviderInterface } from ':core/provider/interface.js';
import {
  FetchPermissionsResponse,
  SpendPermission,
} from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { fetchRPCRequest } from ':util/provider.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPermissions } from './fetchPermissions.js';

// Mock the provider utility
vi.mock(':util/provider.js');

const mockFetchRPCRequest = vi.mocked(fetchRPCRequest);

describe('fetchPermissions (without provider)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      mockFetchRPCRequest.mockResolvedValue(mockResponse);

      const result = await fetchPermissions({
        account: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 8453,
        spender: '0x5678901234567890abcdef1234567890abcdef12',
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

      mockFetchRPCRequest.mockResolvedValue(mockResponse);

      const result = await fetchPermissions({
        account: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 8453,
        spender: '0x5678901234567890abcdef1234567890abcdef12',
      });

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle permissions with minimal required fields', async () => {
      const mockPermissions: SpendPermission[] = [
        {
          signature: '0x987654321fedcba',
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
      ];

      const mockResponse: FetchPermissionsResponse = {
        permissions: mockPermissions,
      };

      mockFetchRPCRequest.mockResolvedValue(mockResponse);

      const result = await fetchPermissions({
        account: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 8453,
        spender: '0x5678901234567890abcdef1234567890abcdef12',
      });

      expect(result).toEqual(mockPermissions);
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('permissionHash');
      expect(result[0]).not.toHaveProperty('chainId');
    });
  });

  describe('parameter handling', () => {
    it('should convert chainId to hex format correctly', async () => {
      const mockResponse: FetchPermissionsResponse = {
        permissions: [],
      };

      mockFetchRPCRequest.mockResolvedValue(mockResponse);

      // Test different chainIds
      const testCases = [
        { input: 1, expected: '0x1' },
        { input: 8453, expected: '0x2105' },
        { input: 137, expected: '0x89' },
        { input: 42161, expected: '0xa4b1' },
        { input: 10, expected: '0xa' },
        { input: 1337, expected: '0x539' },
      ];

      for (const testCase of testCases) {
        mockFetchRPCRequest.mockClear();

        await fetchPermissions({
          account: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: testCase.input,
          spender: '0x5678901234567890abcdef1234567890abcdef12',
        });

        expect(mockFetchRPCRequest).toHaveBeenCalledWith(
          {
            method: 'coinbase_fetchPermissions',
            params: [
              {
                account: '0x1234567890abcdef1234567890abcdef12345678',
                chainId: testCase.expected,
                spender: '0x5678901234567890abcdef1234567890abcdef12',
              },
            ],
          },
          CB_WALLET_RPC_URL
        );
      }
    });

    it('should use the correct RPC URL', async () => {
      const mockResponse: FetchPermissionsResponse = {
        permissions: [],
      };

      mockFetchRPCRequest.mockResolvedValue(mockResponse);

      await fetchPermissions({
        account: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 8453,
        spender: '0x5678901234567890abcdef1234567890abcdef12',
      });

      expect(mockFetchRPCRequest).toHaveBeenCalledWith(expect.any(Object), CB_WALLET_RPC_URL);
    });
  });

  describe('error handling', () => {
    it('should propagate fetchRPCRequest errors', async () => {
      const errorMessage = 'Network error';
      mockFetchRPCRequest.mockRejectedValue(new Error(errorMessage));

      await expect(
        fetchPermissions({
          account: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: 8453,
          spender: '0x5678901234567890abcdef1234567890abcdef12',
        })
      ).rejects.toThrow(errorMessage);
    });
  });
});

describe('fetchPermissions (with provider)', () => {
  const mockProvider = {
    request: vi.fn(),
  } as unknown as ProviderInterface;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful requests', () => {
    it('should fetch permissions successfully using provider', async () => {
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
      ];

      const mockResponse: FetchPermissionsResponse = {
        permissions: mockPermissions,
      };

      vi.mocked(mockProvider.request).mockResolvedValue(mockResponse);

      const result = await fetchPermissions({
        provider: mockProvider,
        account: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 8453,
        spender: '0x5678901234567890abcdef1234567890abcdef12',
      });

      expect(result).toEqual(mockPermissions);
      expect(mockProvider.request).toHaveBeenCalledWith({
        method: 'coinbase_fetchPermissions',
        params: [
          {
            account: '0x1234567890abcdef1234567890abcdef12345678',
            chainId: '0x2105',
            spender: '0x5678901234567890abcdef1234567890abcdef12',
          },
        ],
      });
      // Ensure fetchRPCRequest was NOT called when provider is provided
      expect(mockFetchRPCRequest).not.toHaveBeenCalled();
    });
  });

  describe('parameter handling', () => {
    it('should convert chainId to hex format correctly with provider', async () => {
      const mockResponse: FetchPermissionsResponse = {
        permissions: [],
      };

      vi.mocked(mockProvider.request).mockResolvedValue(mockResponse);

      const testCases = [
        { input: 1, expected: '0x1' },
        { input: 8453, expected: '0x2105' },
        { input: 137, expected: '0x89' },
      ];

      for (const testCase of testCases) {
        vi.mocked(mockProvider.request).mockClear();

        await fetchPermissions({
          provider: mockProvider,
          account: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: testCase.input,
          spender: '0x5678901234567890abcdef1234567890abcdef12',
        });

        expect(mockProvider.request).toHaveBeenCalledWith({
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
      const errorMessage = 'Provider error';
      vi.mocked(mockProvider.request).mockRejectedValue(new Error(errorMessage));

      await expect(
        fetchPermissions({
          provider: mockProvider,
          account: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: 8453,
          spender: '0x5678901234567890abcdef1234567890abcdef12',
        })
      ).rejects.toThrow(errorMessage);
    });
  });
});

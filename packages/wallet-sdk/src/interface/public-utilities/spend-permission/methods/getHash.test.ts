import { spendPermissionManagerAbi, spendPermissionManagerAddress } from '../constants.js';
import { createClients, getClient } from ':core/namespaces/eip155/client/index.js';
import { http, createPublicClient } from 'viem';
import { readContract } from 'viem/actions';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpendPermissionTypedData } from '../utils.js';
import { getHash } from './getHash.js';

vi.mock(':core/namespaces/eip155/client/index.js', () => ({
  getClient: vi.fn(),
  createClients: vi.fn(),
}));

vi.mock('viem/actions', () => ({
  readContract: vi.fn(),
}));

describe('getHash', () => {
  let mockClient: ReturnType<typeof createPublicClient>;
  let mockPermission: SpendPermissionTypedData['message'];
  const mockHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = createPublicClient({
      transport: http('http://localhost:8545'),
    });

    mockPermission = {
      account: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      spender: '0x5678901234567890abcdef1234567890abcdef12' as `0x${string}`,
      token: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as `0x${string}`,
      allowance: '1000000000000000000',
      period: 86400,
      start: 1234567890,
      end: 1234654290,
      salt: '123456789',
      extraData: '0x' as `0x${string}`,
    };
  });

  describe('successful requests', () => {
    it('should return permission hash successfully', async () => {
      (getClient as Mock).mockReturnValue(mockClient);
      (readContract as Mock).mockResolvedValue(mockHash);

      const result = await getHash({ permission: mockPermission, chainId: 8453 });

      expect(result).toBe(mockHash);
      expect(getClient).toHaveBeenCalledWith(8453);
      expect(createClients).not.toHaveBeenCalled();
      expect(readContract).toHaveBeenCalledWith(mockClient, {
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'getHash',
        args: [
          {
            account: mockPermission.account,
            spender: mockPermission.spender,
            token: mockPermission.token,
            allowance: BigInt(mockPermission.allowance),
            period: mockPermission.period,
            start: mockPermission.start,
            end: mockPermission.end,
            salt: BigInt(mockPermission.salt),
            extraData: mockPermission.extraData,
          },
        ],
      });
    });

    it('should handle different chain IDs correctly', async () => {
      (getClient as Mock).mockReturnValue(mockClient);
      (readContract as Mock).mockResolvedValue(mockHash);

      const testChainIds = [1, 8453, 137, 42161];

      for (const chainId of testChainIds) {
        (getClient as Mock).mockClear();
        (createClients as Mock).mockClear();
        (readContract as Mock).mockClear();

        await getHash({ permission: mockPermission, chainId });

        expect(getClient).toHaveBeenCalledWith(chainId);
      }
    });

    it('should work with supported fallback client when getClient returns one', async () => {
      // With the curated supported chains list, getClient will automatically create a fallback client
      // if one doesn't exist in storage and the chain is in the supported list
      (getClient as Mock).mockReturnValue(mockClient);
      (readContract as Mock).mockResolvedValue(mockHash);

      await getHash({ permission: mockPermission, chainId: 8453 });

      expect(getClient).toHaveBeenCalledWith(8453);
      expect(readContract).toHaveBeenCalledWith(mockClient, expect.any(Object));
    });
  });

  describe('parameter handling', () => {
    it('should properly convert allowance and salt to BigInt', async () => {
      (getClient as Mock).mockReturnValue(mockClient);
      (readContract as Mock).mockResolvedValue(mockHash);

      const testPermission = {
        ...mockPermission,
        allowance: '999999999999999999999', // Large number as string
        salt: '18446744073709551615', // Max uint64 as string
      };

      await getHash({ permission: testPermission, chainId: 8453 });

      expect(readContract).toHaveBeenCalledWith(mockClient, {
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'getHash',
        args: [
          {
            account: testPermission.account,
            spender: testPermission.spender,
            token: testPermission.token,
            allowance: BigInt('999999999999999999999'),
            period: testPermission.period,
            start: testPermission.start,
            end: testPermission.end,
            salt: BigInt('18446744073709551615'),
            extraData: testPermission.extraData,
          },
        ],
      });
    });

    it('should handle zero values correctly', async () => {
      (getClient as Mock).mockReturnValue(mockClient);
      (readContract as Mock).mockResolvedValue(mockHash);

      const testPermission = {
        ...mockPermission,
        allowance: '0',
        salt: '0',
        start: 0,
        end: 0,
        period: 0,
      };

      await getHash({ permission: testPermission, chainId: 8453 });

      expect(readContract).toHaveBeenCalledWith(mockClient, {
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'getHash',
        args: [
          {
            account: testPermission.account,
            spender: testPermission.spender,
            token: testPermission.token,
            allowance: BigInt(0),
            period: 0,
            start: 0,
            end: 0,
            salt: BigInt(0),
            extraData: testPermission.extraData,
          },
        ],
      });
    });

    it('should handle extraData properly', async () => {
      (getClient as Mock).mockReturnValue(mockClient);
      (readContract as Mock).mockResolvedValue(mockHash);

      const testPermission = {
        ...mockPermission,
        extraData: '0x1234abcd' as `0x${string}`,
      };

      await getHash({ permission: testPermission, chainId: 8453 });

      expect(readContract).toHaveBeenCalledWith(mockClient, {
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'getHash',
        args: [
          expect.objectContaining({
            extraData: '0x1234abcd',
          }),
        ],
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when no client is found', async () => {
      // getClient returns undefined when chain is not in the supported list or has no RPC URL
      (getClient as Mock).mockReturnValue(undefined);

      await expect(getHash({ permission: mockPermission, chainId: 999999 })).rejects.toThrow(
        'No client found for chain ID 999999. Chain not supported or RPC URL not available'
      );

      expect(getClient).toHaveBeenCalledWith(999999);
      expect(createClients).not.toHaveBeenCalled();
      expect(readContract).not.toHaveBeenCalled();
    });

    it('should propagate readContract errors', async () => {
      (getClient as Mock).mockReturnValue(mockClient);
      const contractError = new Error('Contract call failed');
      (readContract as Mock).mockRejectedValue(contractError);

      await expect(getHash({ permission: mockPermission, chainId: 8453 })).rejects.toThrow(
        'Contract call failed'
      );

      expect(getClient).toHaveBeenCalledWith(8453);
      expect(readContract).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      (getClient as Mock).mockReturnValue(mockClient);
      (readContract as Mock).mockRejectedValue(new Error('Network request failed'));

      await expect(getHash({ permission: mockPermission, chainId: 8453 })).rejects.toThrow(
        'Network request failed'
      );
    });
  });

  describe('contract interaction', () => {
    it('should call readContract with correct parameters', async () => {
      (getClient as Mock).mockReturnValue(mockClient);
      (readContract as Mock).mockResolvedValue(mockHash);

      await getHash({ permission: mockPermission, chainId: 8453 });

      expect(readContract).toHaveBeenCalledTimes(1);
      expect(readContract).toHaveBeenCalledWith(mockClient, {
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'getHash',
        args: [
          {
            account: mockPermission.account,
            spender: mockPermission.spender,
            token: mockPermission.token,
            allowance: BigInt(mockPermission.allowance),
            period: mockPermission.period,
            start: mockPermission.start,
            end: mockPermission.end,
            salt: BigInt(mockPermission.salt),
            extraData: mockPermission.extraData,
          },
        ],
      });
    });
  });
});

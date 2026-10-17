import { spendPermissionManagerAbi, spendPermissionManagerAddress } from '../constants.js';
import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { getClient } from ':core/namespaces/eip155/client/index.js';
import { http, PublicClient, createPublicClient } from 'viem';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { multicall } from '../../multicall/index.js';
import { timestampInSecondsToDate, toSpendPermissionArgs } from '../utils.js';
import { getPublicClientFromChainId } from '../utils.node.js';
import { GetPermissionStatusResponseType, getPermissionStatus } from './getPermissionStatus.js';

vi.mock(':core/namespaces/eip155/client/index.js', () => ({
  getClient: vi.fn(),
}));

vi.mock('../utils.node.js', () => ({
  getPublicClientFromChainId: vi.fn(),
}));

const getPublicClientFromChainIdSpy = vi.mocked(getPublicClientFromChainId);

vi.mock('../../multicall/index.js', () => ({
  multicall: vi.fn(),
  unwrapMulticallResults: vi.fn((results: any[]) => {
    return results.map((result, index) => {
      if (result.status === 'success') {
        return result.result;
      }
      throw new Error(`Call ${index} failed`);
    });
  }),
}));

vi.mock('../utils.js', () => ({
  toSpendPermissionArgs: vi.fn(),
  timestampInSecondsToDate: vi.fn(),
  calculateCurrentPeriod: vi.fn(),
}));

describe('getPermissionStatus - browser + node', () => {
  let mockClient: ReturnType<typeof createPublicClient>;
  let mockSpendPermission: SpendPermission;
  let mockSpendPermissionArgs: ReturnType<typeof toSpendPermissionArgs>;

  // Helper function to create multicall response
  const createMulticallResponse = (
    currentPeriod: { start: number; end: number; spend: bigint },
    isRevoked: boolean,
    isValid: boolean
  ) => [
    { status: 'success' as const, result: currentPeriod },
    { status: 'success' as const, result: isRevoked },
    { status: 'success' as const, result: isValid },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = createPublicClient({
      transport: http('http://localhost:8545'),
    });

    getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);

    mockSpendPermission = {
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

    mockSpendPermissionArgs = {
      account: '0x1234567890aBcDeF1234567890aBcDeF12345678' as `0x${string}`,
      spender: '0x5678901234567890abCDEF1234567890abCDEF12' as `0x${string}`,
      token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
      allowance: BigInt('1000000000000000000'),
      period: 86400,
      start: 1234567890,
      end: 1234654290,
      salt: BigInt('123456789'),
      extraData: '0x' as `0x${string}`,
    };

    (toSpendPermissionArgs as Mock).mockReturnValue(mockSpendPermissionArgs);
    (timestampInSecondsToDate as Mock).mockImplementation(
      (timestamp: number) => new Date(timestamp * 1000)
    );
  });

  describe('successful requests', () => {
    it('should return correct permission status with remaining spend', async () => {
      const mockCurrentPeriod = {
        start: 1640995200,
        end: 1641081600,
        spend: BigInt('500000000000000000'), // 0.5 ETH spent
      };
      const mockIsRevoked = false;

      // Mock Date.now() to control the current timestamp
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1234567890 * 1000); // Set to same as permission start time

      // Test with browser environment (client in store)
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, mockIsRevoked, true)
      );

      const result: GetPermissionStatusResponseType =
        await getPermissionStatus(mockSpendPermission);

      expect(result).toEqual({
        remainingSpend: BigInt('500000000000000000'), // 1 ETH - 0.5 ETH = 0.5 ETH remaining
        nextPeriodStart: new Date(1641081601 * 1000), // end + 1 converted to Date
        isRevoked: false,
        isExpired: false, // current time (1234567890) < end time (1234654290)
        isActive: true, // not revoked and not expired
        isApprovedOnchain: true, // isValid returns true
        currentPeriod: mockCurrentPeriod,
      });

      expect(getClient).toHaveBeenCalledWith(8453);
      expect(toSpendPermissionArgs).toHaveBeenCalledWith(mockSpendPermission);
      expect(multicall).toHaveBeenCalledTimes(1);

      // Test with node environment (no client in store)
      (getClient as Mock).mockReturnValue(null);
      getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, mockIsRevoked, true)
      );

      const nodeResult: GetPermissionStatusResponseType =
        await getPermissionStatus(mockSpendPermission);

      expect(nodeResult).toEqual(result);
      expect(getPublicClientFromChainIdSpy).toHaveBeenCalledWith(8453);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should return zero remaining spend when allowance is exceeded', async () => {
      const mockCurrentPeriod = {
        start: 1640995200,
        end: 1641081600,
        spend: BigInt('1500000000000000000'), // 1.5 ETH spent (more than allowance)
      };
      const mockIsRevoked = false;

      // Mock Date.now() to control the current timestamp
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1234567890 * 1000); // Set to same as permission start time

      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, mockIsRevoked, true)
      );

      const result = await getPermissionStatus(mockSpendPermission);

      expect(result.remainingSpend).toBe(BigInt(0));
      expect(result.isRevoked).toBe(false);
      expect(result.isExpired).toBe(false);
      expect(result.isActive).toBe(true);
      expect(result.isApprovedOnchain).toBe(true);
      expect(result.currentPeriod).toEqual(mockCurrentPeriod);

      // Test with node environment
      (getClient as Mock).mockReturnValue(null);
      getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, mockIsRevoked, true)
      );

      const nodeResult = await getPermissionStatus(mockSpendPermission);

      expect(nodeResult).toEqual(result);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should return inactive status when permission is revoked', async () => {
      const mockCurrentPeriod = {
        start: 1640995200,
        end: 1641081600,
        spend: BigInt('0'),
      };
      const mockIsRevoked = true;

      // Mock Date.now() to control the current timestamp
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1234567890 * 1000); // Set to same as permission start time

      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, mockIsRevoked, true)
      );

      const result = await getPermissionStatus(mockSpendPermission);

      expect(result.isRevoked).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.isActive).toBe(false);
      expect(result.isApprovedOnchain).toBe(true);
      expect(result.currentPeriod).toEqual(mockCurrentPeriod);

      // Test with node environment
      (getClient as Mock).mockReturnValue(null);
      getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, mockIsRevoked, true)
      );

      const nodeResult = await getPermissionStatus(mockSpendPermission);

      expect(nodeResult).toEqual(result);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should return inactive status when permission is expired', async () => {
      const mockCurrentPeriod = {
        start: 1640995200,
        end: 1641081600,
        spend: BigInt('0'),
      };
      const mockIsRevoked = false;

      // Mock Date.now() to be after the permission end time
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1234654291 * 1000); // Set to after permission end time (1234654290)

      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, mockIsRevoked, true)
      );

      const result = await getPermissionStatus(mockSpendPermission);

      expect(result.isRevoked).toBe(false);
      expect(result.isExpired).toBe(true);
      expect(result.isActive).toBe(false);
      expect(result.isApprovedOnchain).toBe(true);
      expect(result.currentPeriod).toEqual(mockCurrentPeriod);

      // Test with node environment
      (getClient as Mock).mockReturnValue(null);
      getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, mockIsRevoked, true)
      );

      const nodeResult = await getPermissionStatus(mockSpendPermission);

      expect(nodeResult).toEqual(result);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should handle different chain IDs correctly', async () => {
      const testChainIds = [1, 8453, 137, 42161];

      // Mock Date.now() to control the current timestamp
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1234567890 * 1000); // Set to same as permission start time

      for (const chainId of testChainIds) {
        const permission = { ...mockSpendPermission, chainId };
        const mockCurrentPeriod = { start: 1, end: 2, spend: BigInt('0') };

        // Test with browser environment
        (getClient as Mock).mockReturnValue(mockClient);
        (multicall as Mock).mockResolvedValueOnce(
          createMulticallResponse(mockCurrentPeriod, false, true)
        );

        await getPermissionStatus(permission);

        expect(getClient).toHaveBeenCalledWith(chainId);

        // Test with node environment
        (getClient as Mock).mockReturnValue(null);
        getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
        (multicall as Mock).mockResolvedValueOnce(
          createMulticallResponse(mockCurrentPeriod, false, true)
        );

        await getPermissionStatus(permission);

        expect(getPublicClientFromChainIdSpy).toHaveBeenCalledWith(chainId);
      }

      // Restore Date.now
      Date.now = originalDateNow;
    });
  });

  describe('error handling', () => {
    it('should throw error when chainId is missing', async () => {
      const permissionWithoutChainId = {
        ...mockSpendPermission,
        chainId: undefined,
      };

      // Test with browser environment
      await expect(getPermissionStatus(permissionWithoutChainId)).rejects.toThrow(
        'chainId is missing in the spend permission'
      );

      expect(getClient).not.toHaveBeenCalled();
      expect(multicall).not.toHaveBeenCalled();

      // Test with node environment
      (getClient as Mock).mockReturnValue(null);

      await expect(getPermissionStatus(permissionWithoutChainId)).rejects.toThrow(
        'chainId is missing in the spend permission'
      );

      expect(getPublicClientFromChainIdSpy).not.toHaveBeenCalled();
      expect(multicall).not.toHaveBeenCalled();
    });

    it('should throw error when client is not available', async () => {
      // Test with browser environment (no client in store)
      (getClient as Mock).mockReturnValue(null);
      getPublicClientFromChainIdSpy.mockReturnValue(undefined);

      await expect(getPermissionStatus(mockSpendPermission)).rejects.toThrow(
        'No client available for chain ID 8453. Chain is not supported.'
      );

      expect(getClient).toHaveBeenCalledWith(8453);
      expect(getPublicClientFromChainIdSpy).toHaveBeenCalledWith(8453);
      expect(multicall).not.toHaveBeenCalled();
    });

    it('should propagate multicall errors', async () => {
      const contractError = new Error('Contract call failed');

      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockRejectedValue(contractError);

      await expect(getPermissionStatus(mockSpendPermission)).rejects.toThrow(
        'Contract call failed'
      );

      expect(getClient).toHaveBeenCalledWith(8453);
      expect(multicall).toHaveBeenCalled();

      // Test with node environment
      (getClient as Mock).mockReturnValue(null);
      getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
      (multicall as Mock).mockRejectedValue(contractError);

      await expect(getPermissionStatus(mockSpendPermission)).rejects.toThrow(
        'Contract call failed'
      );

      expect(getPublicClientFromChainIdSpy).toHaveBeenCalledWith(8453);
      expect(multicall).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');

      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockRejectedValue(networkError);

      await expect(getPermissionStatus(mockSpendPermission)).rejects.toThrow(
        'Network request failed'
      );

      // Test with node environment
      (getClient as Mock).mockReturnValue(null);
      getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
      (multicall as Mock).mockRejectedValue(networkError);

      await expect(getPermissionStatus(mockSpendPermission)).rejects.toThrow(
        'Network request failed'
      );
    });

    it('should handle multicall failure for getCurrentPeriod', async () => {
      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockResolvedValueOnce([
        { status: 'failure' as const, error: new Error('Call failed') },
        { status: 'success' as const, result: false },
        { status: 'success' as const, result: true },
      ]);

      await expect(getPermissionStatus(mockSpendPermission)).rejects.toThrow('Call 0 failed');
    });

    it('should handle multicall failure for isRevoked', async () => {
      const mockCurrentPeriod = { start: 1, end: 2, spend: BigInt('0') };

      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockResolvedValueOnce([
        { status: 'success' as const, result: mockCurrentPeriod },
        { status: 'failure' as const, error: new Error('Call failed') },
        { status: 'success' as const, result: true },
      ]);

      await expect(getPermissionStatus(mockSpendPermission)).rejects.toThrow('Call 1 failed');
    });

    it('should handle multicall failure for isValid', async () => {
      const mockCurrentPeriod = { start: 1, end: 2, spend: BigInt('0') };

      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockResolvedValueOnce([
        { status: 'success' as const, result: mockCurrentPeriod },
        { status: 'success' as const, result: false },
        { status: 'failure' as const, error: new Error('Call failed') },
      ]);

      await expect(getPermissionStatus(mockSpendPermission)).rejects.toThrow('Call 2 failed');
    });
  });

  describe('contract call verification', () => {
    it.each([
      ['browser', getPermissionStatus],
      ['node', getPermissionStatus],
    ])(
      'should call all required contract functions with correct parameters for %s environment',
      async (environment, getPermissionStatusFunc) => {
        const mockCurrentPeriod = { start: 1, end: 2, spend: BigInt('0') };

        // Mock Date.now() to control the current timestamp
        const originalDateNow = Date.now;
        Date.now = vi.fn(() => 1234567890 * 1000); // Set to same as permission start time

        if (environment === 'browser') {
          (getClient as Mock).mockReturnValue(mockClient);
        } else {
          (getClient as Mock).mockReturnValue(null);
          getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
        }

        (multicall as Mock).mockResolvedValueOnce(
          createMulticallResponse(mockCurrentPeriod, false, true)
        );

        await getPermissionStatusFunc(mockSpendPermission);

        expect(multicall).toHaveBeenCalledTimes(1);

        // Verify multicall was called with correct contracts
        expect(multicall).toHaveBeenCalledWith(mockClient, {
          contracts: [
            {
              address: spendPermissionManagerAddress,
              abi: spendPermissionManagerAbi,
              functionName: 'getCurrentPeriod',
              args: [mockSpendPermissionArgs],
            },
            {
              address: spendPermissionManagerAddress,
              abi: spendPermissionManagerAbi,
              functionName: 'isRevoked',
              args: [mockSpendPermissionArgs],
            },
            {
              address: spendPermissionManagerAddress,
              abi: spendPermissionManagerAbi,
              functionName: 'isValid',
              args: [mockSpendPermissionArgs],
            },
          ],
          errorMessages: [
            'Failed to fetch current period',
            'Failed to fetch revoked status',
            'Failed to fetch valid status',
          ],
        });

        // Restore Date.now
        Date.now = originalDateNow;
      }
    );

    it.each([
      ['browser', getPermissionStatus],
      ['node', getPermissionStatus],
    ])(
      'should batch all contract calls into a single multicall for %s environment',
      async (environment, getPermissionStatusFunc) => {
        const mockCurrentPeriod = { start: 1, end: 2, spend: BigInt('0') };

        // Mock Date.now() to control the current timestamp
        const originalDateNow = Date.now;
        Date.now = vi.fn(() => 1234567890 * 1000); // Set to same as permission start time

        if (environment === 'browser') {
          (getClient as Mock).mockReturnValue(mockClient);
        } else {
          (getClient as Mock).mockReturnValue(null);
          getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
        }

        (multicall as Mock).mockResolvedValueOnce(
          createMulticallResponse(mockCurrentPeriod, false, true)
        );

        await getPermissionStatusFunc(mockSpendPermission);

        // Verify only one multicall is made (batching all 3 contract reads)
        expect(multicall).toHaveBeenCalledTimes(1);

        // Restore Date.now
        Date.now = originalDateNow;
      }
    );
  });

  describe('edge cases', () => {
    it('should handle zero allowance correctly', async () => {
      const permissionWithZeroAllowance = {
        ...mockSpendPermission,
        permission: {
          ...mockSpendPermission.permission,
          allowance: '0',
        },
      };

      const mockCurrentPeriod = { start: 1, end: 2, spend: BigInt('0') };

      // Mock Date.now() to control the current timestamp
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1234567890 * 1000); // Set to same as permission start time

      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, false, true)
      );

      const result = await getPermissionStatus(permissionWithZeroAllowance);

      expect(result.remainingSpend).toBe(BigInt(0));
      expect(result.currentPeriod).toEqual(mockCurrentPeriod);

      // Test with node environment
      (getClient as Mock).mockReturnValue(null);
      getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, false, true)
      );

      const nodeResult = await getPermissionStatus(permissionWithZeroAllowance);

      expect(nodeResult).toEqual(result);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should handle very large allowance values', async () => {
      const permissionWithLargeAllowance = {
        ...mockSpendPermission,
        permission: {
          ...mockSpendPermission.permission,
          allowance: '999999999999999999999999999999',
        },
      };

      const mockCurrentPeriod = {
        start: 1,
        end: 2,
        spend: BigInt('1000000000000000000'),
      };

      // Mock Date.now() to control the current timestamp
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1234567890 * 1000); // Set to same as permission start time

      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, false, true)
      );

      const result = await getPermissionStatus(permissionWithLargeAllowance);

      expect(result.remainingSpend).toBe(
        BigInt('999999999999999999999999999999') - BigInt('1000000000000000000')
      );
      expect(result.currentPeriod).toEqual(mockCurrentPeriod);

      // Test with node environment
      (getClient as Mock).mockReturnValue(null);
      getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, false, true)
      );

      const nodeResult = await getPermissionStatus(permissionWithLargeAllowance);

      expect(nodeResult).toEqual(result);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should handle period end at maximum timestamp', async () => {
      const mockCurrentPeriod = {
        start: 1,
        end: 2147483647, // Max 32-bit timestamp
        spend: BigInt('0'),
      };

      // Mock Date.now() to control the current timestamp
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1234567890 * 1000); // Set to same as permission start time

      // Test with browser environment
      (getClient as Mock).mockReturnValue(mockClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, false, true)
      );

      const result = await getPermissionStatus(mockSpendPermission);

      expect(result.nextPeriodStart).toEqual(new Date(2147483648 * 1000));
      expect(result.currentPeriod).toEqual(mockCurrentPeriod);

      // Test with node environment
      (getClient as Mock).mockReturnValue(null);
      getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);
      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, false, true)
      );

      const nodeResult = await getPermissionStatus(mockSpendPermission);

      expect(nodeResult).toEqual(result);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should use custom RPC URL when provided', async () => {
      const mockCurrentPeriod = {
        start: 1640995200,
        end: 1641081600,
        spend: BigInt('0'),
      };
      const mockIsRevoked = false;
      const customRpcUrl = 'https://custom-rpc.example.com';

      // Mock Date.now() to control the current timestamp
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => 1234567890 * 1000);

      // When custom RPC URL is provided, a new client should be created with custom transport
      getPublicClientFromChainIdSpy.mockReturnValue(mockClient as unknown as PublicClient);

      (multicall as Mock).mockResolvedValueOnce(
        createMulticallResponse(mockCurrentPeriod, mockIsRevoked, true)
      );

      const result = await getPermissionStatus(mockSpendPermission, { rpcUrl: customRpcUrl });

      expect(result).toEqual({
        remainingSpend: BigInt('1000000000000000000'),
        nextPeriodStart: new Date(1641081601 * 1000),
        isRevoked: false,
        isExpired: false,
        isActive: true,
        isApprovedOnchain: true,
        currentPeriod: mockCurrentPeriod,
      });

      expect(multicall).toHaveBeenCalledTimes(1);
      expect(toSpendPermissionArgs).toHaveBeenCalledWith(mockSpendPermission);

      // Verify that getClient was not called when custom RPC URL is provided
      expect(getClient).not.toHaveBeenCalled();

      // Restore Date.now
      Date.now = originalDateNow;
    });
  });
});

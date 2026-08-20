import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
} from ':core/sub-account/constants.js';
import { Address, Hex, encodeFunctionData } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toSpendPermissionArgs } from '../utils.js';
import { GetPermissionStatusResponseType, getPermissionStatus } from './getPermissionStatus.js';
import { PrepareSpendCallDataResponseType, prepareSpendCallData } from './prepareSpendCallData.js';

vi.mock('./getPermissionStatus.js');
vi.mock('../utils.js');
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    encodeFunctionData: vi.fn(),
  };
});

const mockGetPermissionStatus = vi.mocked(getPermissionStatus);
const mockToSpendPermissionArgs = vi.mocked(toSpendPermissionArgs);
const mockEncodeFunctionData = vi.mocked(encodeFunctionData);

// Factory function to create a complete mock status object
// This makes tests more resilient to changes in GetPermissionStatusResponseType
function createMockPermissionStatus(
  overrides?: Partial<GetPermissionStatusResponseType>
): GetPermissionStatusResponseType {
  const defaultStatus: GetPermissionStatusResponseType = {
    remainingSpend: BigInt('500000000000000000'), // 0.5 ETH remaining
    nextPeriodStart: new Date('2024-01-01T00:00:00Z'),
    isActive: true,
    isRevoked: false,
    isExpired: false,
    isApprovedOnchain: true,
    currentPeriod: {
      start: 1234567890,
      end: 1234654290,
      spend: BigInt('500000000000000000'),
    },
  };

  return {
    ...defaultStatus,
    ...overrides,
  };
}

describe('prepareSpendCallData', () => {
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

  const mockSpendPermissionArgs = {
    account: '0x1234567890AbcdEF1234567890aBcdef12345678' as Address,
    spender: '0x5678901234567890abCDEf1234567890ABcDef12' as Address,
    token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
    allowance: BigInt('1000000000000000000'),
    period: 86400,
    start: 1234567890,
    end: 1234654290,
    salt: BigInt('123456789'),
    extraData: '0x' as Hex,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Use the factory function to create default mock status
    mockGetPermissionStatus.mockResolvedValue(createMockPermissionStatus());

    mockToSpendPermissionArgs.mockReturnValue(mockSpendPermissionArgs);

    mockEncodeFunctionData.mockImplementation(({ functionName }) => {
      if (functionName === 'approveWithSignature') {
        return '0xapprovedata123456' as `0x${string}`;
      }
      if (functionName === 'spend') {
        return '0xspenddata789abc' as `0x${string}`;
      }
      return '0xinvaliddata' as `0x${string}`;
    });
  });

  it('should prepare call data for approve and spend operations when permission is not approved onchain', async () => {
    mockGetPermissionStatus.mockResolvedValue(
      createMockPermissionStatus({ isApprovedOnchain: false })
    );

    const result = await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      to: spendPermissionManagerAddress,
      data: '0xapprovedata123456',
      value: 0n,
    });
    expect(result[1]).toEqual({
      to: spendPermissionManagerAddress,
      data: '0xspenddata789abc',
      value: 0n,
    });
  });

  it('should prepare call data for spend operation only when permission is already active', async () => {
    mockGetPermissionStatus.mockResolvedValue(createMockPermissionStatus());

    const result = await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      to: spendPermissionManagerAddress,
      data: '0xspenddata789abc',
      value: 0n,
    });

    // Verify approve call is not made when permission is already approved onchain
    expect(mockEncodeFunctionData).not.toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: expect.any(Array),
    });
  });

  it('should use remaining spend amount when max-remaining-allowance is specified', async () => {
    const remainingSpend = BigInt('750000000000000000');
    mockGetPermissionStatus.mockResolvedValue(createMockPermissionStatus({ remainingSpend }));

    await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'spend',
      args: [mockSpendPermissionArgs, remainingSpend],
    });
  });

  it('should use provided amount when specified', async () => {
    const customAmount = BigInt('250000000000000000'); // 0.25 ETH

    await prepareSpendCallData(mockSpendPermission, customAmount);

    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'spend',
      args: [mockSpendPermissionArgs, customAmount],
    });
  });

  it('should call getPermissionStatus with the correct permission', async () => {
    await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    expect(mockGetPermissionStatus).toHaveBeenCalledWith(mockSpendPermission, undefined);
  });

  it('should pass rpcUrl option to getPermissionStatus when provided', async () => {
    const customRpcUrl = 'https://my-custom-rpc.example.com';

    await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance', undefined, {
      rpcUrl: customRpcUrl,
    });

    expect(mockGetPermissionStatus).toHaveBeenCalledWith(mockSpendPermission, {
      rpcUrl: customRpcUrl,
    });
  });

  it('should call toSpendPermissionArgs with the correct permission', async () => {
    await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    expect(mockToSpendPermissionArgs).toHaveBeenCalledWith(mockSpendPermission);
  });

  it('should encode approveWithSignature function data correctly when permission is not approved onchain', async () => {
    mockGetPermissionStatus.mockResolvedValue(
      createMockPermissionStatus({ isApprovedOnchain: false })
    );

    await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: [mockSpendPermissionArgs, mockSpendPermission.signature],
    });
  });

  it('should encode spend function data correctly', async () => {
    const customAmount = BigInt('300000000000000000');

    await prepareSpendCallData(mockSpendPermission, customAmount);

    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'spend',
      args: [mockSpendPermissionArgs, customAmount],
    });
  });

  it('should return calls with correct structure when permission is not approved onchain', async () => {
    mockGetPermissionStatus.mockResolvedValue(
      createMockPermissionStatus({ isApprovedOnchain: false })
    );

    const result = await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    // Check that result matches the expected type
    const typedResult: PrepareSpendCallDataResponseType = result;
    expect(typedResult).toHaveLength(2);

    // Check approve call structure
    expect(typedResult[0]).toHaveProperty('to');
    expect(typedResult[0]).toHaveProperty('data');
    expect(typedResult[0]).toHaveProperty('value');
    expect(typedResult[0].value).toBe(0n);

    // Check spend call structure
    expect(typedResult[1]).toHaveProperty('to');
    expect(typedResult[1]).toHaveProperty('data');
    expect(typedResult[1]).toHaveProperty('value');
    expect(typedResult[1].value).toBe(0n);
  });

  it('should return calls with correct structure when permission is already approved onchain', async () => {
    mockGetPermissionStatus.mockResolvedValue(createMockPermissionStatus());

    const result = await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    // Check that result matches the expected type
    const typedResult: PrepareSpendCallDataResponseType = result;
    expect(typedResult).toHaveLength(1);

    // Check spend call structure (only call when active)
    expect(typedResult[0]).toHaveProperty('to');
    expect(typedResult[0]).toHaveProperty('data');
    expect(typedResult[0]).toHaveProperty('value');
    expect(typedResult[0].value).toBe(0n);
  });

  it('should handle zero amount', async () => {
    const zeroAmount = BigInt('0');

    await expect(prepareSpendCallData(mockSpendPermission, zeroAmount)).rejects.toThrow(
      'Spend amount cannot be 0'
    );
  });

  it('should throw error when amount exceeds remaining spend', async () => {
    const remainingSpend = BigInt('500000000000000000'); // 0.5 ETH remaining
    const excessiveAmount = BigInt('600000000000000000'); // 0.6 ETH (more than remaining)

    mockGetPermissionStatus.mockResolvedValue(createMockPermissionStatus({ remainingSpend }));

    await expect(prepareSpendCallData(mockSpendPermission, excessiveAmount)).rejects.toThrow(
      'Remaining spend amount is insufficient'
    );
  });

  it('should handle very large amounts', async () => {
    const largeAmount = BigInt('999999999999999999999999999');

    // Mock sufficient remaining balance for the large amount
    mockGetPermissionStatus.mockResolvedValue(
      createMockPermissionStatus({ remainingSpend: largeAmount })
    );

    await prepareSpendCallData(mockSpendPermission, largeAmount);

    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'spend',
      args: [mockSpendPermissionArgs, largeAmount],
    });
  });

  it('should throw error when permission is revoked', async () => {
    mockGetPermissionStatus.mockResolvedValue(
      createMockPermissionStatus({
        isRevoked: true,
      })
    );

    await expect(
      prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance')
    ).rejects.toThrow('Spend permission has been revoked');
  });

  it('should use the same spendPermissionManagerAddress for both calls when permission is not approved onchain', async () => {
    mockGetPermissionStatus.mockResolvedValue(
      createMockPermissionStatus({
        isApprovedOnchain: false,
        isRevoked: false,
      })
    );

    const result = await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    expect(result[0].to).toBe(spendPermissionManagerAddress);
    expect(result[1].to).toBe(spendPermissionManagerAddress);
  });

  it('should use the same spendPermissionManagerAddress for spend call when permission is already approved onchain', async () => {
    mockGetPermissionStatus.mockResolvedValue(createMockPermissionStatus());

    const result = await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    expect(result[0].to).toBe(spendPermissionManagerAddress);
  });

  it('should include ERC20 transfer call when recipient is provided', async () => {
    const recipientAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8' as Address;
    const spendAmount = BigInt('100000000'); // 100 USDC

    mockGetPermissionStatus.mockResolvedValue(createMockPermissionStatus());

    // Mock the transfer call encoding
    mockEncodeFunctionData.mockImplementation(({ functionName }) => {
      if (functionName === 'spend') {
        return '0xspenddata789abc' as `0x${string}`;
      }
      if (functionName === 'transfer') {
        return '0xtransferdata123' as `0x${string}`;
      }
      return '0xinvaliddata' as `0x${string}`;
    });

    const result = await prepareSpendCallData(mockSpendPermission, spendAmount, recipientAddress);

    // Should have 2 calls: spend and transfer
    expect(result).toHaveLength(2);

    // First call should be the spend call
    expect(result[0]).toEqual({
      to: spendPermissionManagerAddress,
      data: '0xspenddata789abc',
      value: 0n,
    });

    // Second call should be the ERC20 transfer
    expect(result[1]).toEqual({
      to: mockSpendPermission.permission.token,
      data: '0xtransferdata123',
      value: 0n,
    });

    // Verify encodeFunctionData was called with correct args for transfer
    expect(mockEncodeFunctionData).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'transfer',
        args: [recipientAddress, spendAmount],
      })
    );
  });

  it('should include transfer with max amount when using max-remaining-allowance with recipient', async () => {
    const recipientAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8' as Address;

    const mockStatus = createMockPermissionStatus();
    mockGetPermissionStatus.mockResolvedValue(mockStatus);

    // Mock the transfer call encoding
    mockEncodeFunctionData.mockImplementation(({ functionName }) => {
      if (functionName === 'spend') {
        return '0xspenddata789abc' as `0x${string}`;
      }
      if (functionName === 'transfer') {
        return '0xtransferdata123' as `0x${string}`;
      }
      return '0xinvaliddata' as `0x${string}`;
    });

    const result = await prepareSpendCallData(
      mockSpendPermission,
      'max-remaining-allowance',
      recipientAddress
    );

    // Should have 2 calls: spend and transfer
    expect(result).toHaveLength(2);

    // Verify encodeFunctionData was called with correct args for transfer using remaining spend
    expect(mockEncodeFunctionData).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'transfer',
        args: [recipientAddress, mockStatus.remainingSpend],
      })
    );
  });

  it('should not include transfer call when recipient is not provided', async () => {
    const spendAmount = BigInt('100000000'); // 100 USDC

    mockGetPermissionStatus.mockResolvedValue(createMockPermissionStatus());

    const result = await prepareSpendCallData(mockSpendPermission, spendAmount);

    // Should only have 1 call: spend (no transfer)
    expect(result).toHaveLength(1);
    expect(result[0].to).toBe(spendPermissionManagerAddress);
  });

  it('should set value to 0x0 for both calls when permission is not approved onchain', async () => {
    mockGetPermissionStatus.mockResolvedValue(
      createMockPermissionStatus({
        isApprovedOnchain: false,
        isExpired: true,
      })
    );

    const result = await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    expect(result[0].value).toBe(0n);
    expect(result[1].value).toBe(0n);
  });

  it('should set value to 0x0 for spend call when permission is already approved onchain', async () => {
    const result = await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    expect(result[0].value).toBe(0n);
  });

  it('should handle remaining spend of zero', async () => {
    mockGetPermissionStatus.mockResolvedValue(
      createMockPermissionStatus({ remainingSpend: BigInt('0') })
    );

    await expect(
      prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance')
    ).rejects.toThrow('Spend amount cannot be 0');
  });

  it('should work correctly when permission status indicates not approved', async () => {
    mockGetPermissionStatus.mockResolvedValue(
      createMockPermissionStatus({
        isApprovedOnchain: false,
        isExpired: true,
      })
    );

    const result = await prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance');

    // Should prepare both calls when permission is not approved onchain
    expect(result).toHaveLength(2);
    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: [mockSpendPermissionArgs, mockSpendPermission.signature],
    });
  });

  it('should propagate errors from getPermissionStatus', async () => {
    const error = new Error('Permission status error');
    mockGetPermissionStatus.mockRejectedValue(error);

    await expect(
      prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance')
    ).rejects.toThrow('Permission status error');
  });

  it('should propagate errors from toSpendPermissionArgs', async () => {
    const error = new Error('Invalid permission args');
    mockToSpendPermissionArgs.mockImplementation(() => {
      throw error;
    });

    await expect(
      prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance')
    ).rejects.toThrow('Invalid permission args');
  });

  it('should propagate errors from encodeFunctionData', async () => {
    const error = new Error('Encoding error');
    mockEncodeFunctionData.mockImplementation(() => {
      throw error;
    });

    await expect(
      prepareSpendCallData(mockSpendPermission, 'max-remaining-allowance')
    ).rejects.toThrow('Encoding error');
  });
});

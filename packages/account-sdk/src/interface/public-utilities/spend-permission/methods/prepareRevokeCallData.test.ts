import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
} from ':core/sub-account/constants.js';
import { type Address, type Hex, encodeFunctionData } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { toSpendPermissionArgs } from '../utils.js';
import { prepareRevokeCallData } from './prepareRevokeCallData.js';

vi.mock('../utils.js', () => ({
  toSpendPermissionArgs: vi.fn(),
}));

vi.mock('viem', () => ({
  encodeFunctionData: vi.fn(),
}));

const mockToSpendPermissionArgs = vi.mocked(toSpendPermissionArgs);
const mockEncodeFunctionData = vi.mocked(encodeFunctionData);

describe('prepareRevokeCallData', () => {
  const mockSpendPermission: SpendPermission = {
    createdAt: 1234567890,
    permissionHash: '0xabcdef123456789abcdef123456789abcdef1234',
    signature: '0x987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0',
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

  const mockSpendPermissionArgs: {
    account: Address;
    spender: Address;
    token: Address;
    allowance: bigint;
    period: number;
    start: number;
    end: number;
    salt: bigint;
    extraData: Hex;
  } = {
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

  const mockEncodedData =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex;

  beforeEach(() => {
    vi.clearAllMocks();
    mockToSpendPermissionArgs.mockReturnValue(mockSpendPermissionArgs);
    mockEncodeFunctionData.mockReturnValue(mockEncodedData);
  });

  it('should prepare revoke call data with correct structure', async () => {
    const result = await prepareRevokeCallData(mockSpendPermission);

    expect(result).toEqual({
      to: spendPermissionManagerAddress,
      data: mockEncodedData,
      value: 0n,
    });
  });

  it('should call toSpendPermissionArgs with the provided permission', async () => {
    await prepareRevokeCallData(mockSpendPermission);

    expect(mockToSpendPermissionArgs).toHaveBeenCalledTimes(1);
    expect(mockToSpendPermissionArgs).toHaveBeenCalledWith(mockSpendPermission);
  });

  it('should call encodeFunctionData with correct parameters', async () => {
    await prepareRevokeCallData(mockSpendPermission);

    expect(mockEncodeFunctionData).toHaveBeenCalledTimes(1);
    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'revokeAsSpender',
      args: [mockSpendPermissionArgs],
    });
  });

  it('should return the correct contract address', async () => {
    const result = await prepareRevokeCallData(mockSpendPermission);

    expect(result.to).toBe(spendPermissionManagerAddress);
  });

  it('should always set value to 0x0', async () => {
    const result = await prepareRevokeCallData(mockSpendPermission);

    expect(result.value).toBe(0n);
  });

  it('should handle different spend permission structures', async () => {
    const differentPermission: SpendPermission = {
      ...mockSpendPermission,
      chainId: 1,
      permission: {
        ...mockSpendPermission.permission,
        allowance: '5000000000000000000',
        period: 172800, // 2 days
        token: '0xa0b86a33e6441b4a42e9daf6c6e4f1e6e9d8e7f0',
      },
    };

    const differentArgs = {
      ...mockSpendPermissionArgs,
      allowance: BigInt('5000000000000000000'),
      period: 172800,
      token: '0xa0b86a33e6441b4a42e9daf6c6e4f1e6e9d8e7f0' as Address,
    };

    mockToSpendPermissionArgs.mockReturnValue(differentArgs);
    const differentEncodedData = '0xdifferentdatahere123456789abcdef' as Hex;
    mockEncodeFunctionData.mockReturnValue(differentEncodedData);

    const result = await prepareRevokeCallData(differentPermission);

    expect(mockToSpendPermissionArgs).toHaveBeenCalledWith(differentPermission);
    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'revokeAsSpender',
      args: [differentArgs],
    });
    expect(result).toEqual({
      to: spendPermissionManagerAddress,
      data: differentEncodedData,
      value: 0n,
    });
  });

  it('should handle permissions with extraData', async () => {
    const permissionWithExtraData: SpendPermission = {
      ...mockSpendPermission,
      permission: {
        ...mockSpendPermission.permission,
        extraData: '0xdeadbeef',
      },
    };

    const argsWithExtraData = {
      ...mockSpendPermissionArgs,
      extraData: '0xdeadbeef' as Hex,
    };

    mockToSpendPermissionArgs.mockReturnValue(argsWithExtraData);

    await prepareRevokeCallData(permissionWithExtraData);

    expect(mockToSpendPermissionArgs).toHaveBeenCalledWith(permissionWithExtraData);
    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'revokeAsSpender',
      args: [argsWithExtraData],
    });
  });

  it('should handle large allowance values', async () => {
    const largeAllowancePermission: SpendPermission = {
      ...mockSpendPermission,
      permission: {
        ...mockSpendPermission.permission,
        allowance: '999999999999999999999999999999',
      },
    };

    const largeAllowanceArgs = {
      ...mockSpendPermissionArgs,
      allowance: BigInt('999999999999999999999999999999'),
    };

    mockToSpendPermissionArgs.mockReturnValue(largeAllowanceArgs);

    await prepareRevokeCallData(largeAllowancePermission);

    expect(mockToSpendPermissionArgs).toHaveBeenCalledWith(largeAllowancePermission);
    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'revokeAsSpender',
      args: [largeAllowanceArgs],
    });
  });
});

import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
} from ':core/sub-account/constants.js';
import { ProviderInterface } from ':core/provider/interface.js';
import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { type Address, type Hex, encodeFunctionData, numberToHex } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { toSpendPermissionArgs } from '../utils.js';
import { requestRevoke } from './requestRevoke.js';

// Mock the utils module
vi.mock('../utils.js', () => ({
  toSpendPermissionArgs: vi.fn(),
}));

// Mock viem functions
vi.mock('viem', () => ({
  encodeFunctionData: vi.fn(),
  numberToHex: vi.fn(),
}));

const mockToSpendPermissionArgs = vi.mocked(toSpendPermissionArgs);
const mockEncodeFunctionData = vi.mocked(encodeFunctionData);
const mockNumberToHex = vi.mocked(numberToHex);

const createMockProvider = (): ProviderInterface =>
  ({
    request: vi.fn(),
  }) as unknown as ProviderInterface;

describe('requestRevoke', () => {
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
  const mockChainIdHex = '0x2105' as Hex;
  const mockTransactionHash =
    '0xabc123def456789abc123def456789abc123def456789abc123def456789abc' as Hex;

  let mockProvider: ProviderInterface;

  beforeEach(() => {
    vi.clearAllMocks();
    mockToSpendPermissionArgs.mockReturnValue(mockSpendPermissionArgs);
    mockEncodeFunctionData.mockReturnValue(mockEncodedData);
    mockNumberToHex.mockReturnValue(mockChainIdHex);
    mockProvider = createMockProvider();
    (mockProvider.request as any).mockResolvedValue(mockTransactionHash);
  });

  it('should successfully revoke a spend permission', async () => {
    const result = await requestRevoke({
      provider: mockProvider,
      permission: mockSpendPermission,
    });

    expect(result).toBe(mockTransactionHash);
  });

  it('should call toSpendPermissionArgs with the provided permission', async () => {
    await requestRevoke({
      provider: mockProvider,
      permission: mockSpendPermission,
    });

    expect(mockToSpendPermissionArgs).toHaveBeenCalledTimes(1);
    expect(mockToSpendPermissionArgs).toHaveBeenCalledWith(mockSpendPermission);
  });

  it('should call encodeFunctionData with correct parameters for revoke function', async () => {
    await requestRevoke({
      provider: mockProvider,
      permission: mockSpendPermission,
    });

    expect(mockEncodeFunctionData).toHaveBeenCalledTimes(1);
    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'revoke',
      args: [mockSpendPermissionArgs],
    });
  });

  it('should convert chainId to hex format', async () => {
    await requestRevoke({
      provider: mockProvider,
      permission: mockSpendPermission,
    });

    expect(mockNumberToHex).toHaveBeenCalledTimes(1);
    expect(mockNumberToHex).toHaveBeenCalledWith(8453);
  });

  it('should call provider.request with correct wallet_sendCalls parameters', async () => {
    await requestRevoke({
      provider: mockProvider,
      permission: mockSpendPermission,
    });

    expect(mockProvider.request).toHaveBeenCalledTimes(1);
    expect(mockProvider.request).toHaveBeenCalledWith({
      method: 'wallet_sendCalls',
      params: [
        {
          version: '2.0.0',
          from: mockSpendPermission.permission.account,
          chainId: mockChainIdHex,
          atomicRequired: true,
          calls: [
            {
              to: spendPermissionManagerAddress,
              data: mockEncodedData,
            },
          ],
        },
      ],
    });
  });

  it('should throw error when chainId is missing', async () => {
    const permissionWithoutChainId: SpendPermission = {
      ...mockSpendPermission,
      chainId: undefined as any,
    };

    await expect(
      requestRevoke({
        provider: mockProvider,
        permission: permissionWithoutChainId,
      })
    ).rejects.toThrow('chainId is required in the spend permission');
  });

  it('should handle provider request errors', async () => {
    const providerError = new Error('Provider request failed');
    (mockProvider.request as any).mockRejectedValue(providerError);

    await expect(
      requestRevoke({
        provider: mockProvider,
        permission: mockSpendPermission,
      })
    ).rejects.toThrow('Provider request failed');
  });

  it('should handle encodeFunctionData errors', async () => {
    const encodingError = new Error('Encoding failed');
    mockEncodeFunctionData.mockImplementation(() => {
      throw encodingError;
    });

    await expect(
      requestRevoke({
        provider: mockProvider,
        permission: mockSpendPermission,
      })
    ).rejects.toThrow('Encoding failed');
  });

  it('should handle toSpendPermissionArgs errors', async () => {
    const argsError = new Error('Arguments conversion failed');
    mockToSpendPermissionArgs.mockImplementation(() => {
      throw argsError;
    });

    await expect(
      requestRevoke({
        provider: mockProvider,
        permission: mockSpendPermission,
      })
    ).rejects.toThrow('Arguments conversion failed');
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

    await requestRevoke({
      provider: mockProvider,
      permission: permissionWithExtraData,
    });

    expect(mockToSpendPermissionArgs).toHaveBeenCalledWith(permissionWithExtraData);
    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'revoke',
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

    await requestRevoke({
      provider: mockProvider,
      permission: largeAllowancePermission,
    });

    expect(mockToSpendPermissionArgs).toHaveBeenCalledWith(largeAllowancePermission);
    expect(mockEncodeFunctionData).toHaveBeenCalledWith({
      abi: spendPermissionManagerAbi,
      functionName: 'revoke',
      args: [largeAllowanceArgs],
    });
  });

  it('should validate that atomicRequired is always true', async () => {
    await requestRevoke({
      provider: mockProvider,
      permission: mockSpendPermission,
    });

    const calledParams = (mockProvider.request as any).mock.calls[0][0];
    expect(calledParams.params[0].atomicRequired).toBe(true);
  });

  it('should validate that version is always 2.0.0', async () => {
    await requestRevoke({
      provider: mockProvider,
      permission: mockSpendPermission,
    });

    const calledParams = (mockProvider.request as any).mock.calls[0][0];
    expect(calledParams.params[0].version).toBe('2.0.0');
  });

  it('should validate that method is always wallet_sendCalls', async () => {
    await requestRevoke({
      provider: mockProvider,
      permission: mockSpendPermission,
    });

    const calledParams = (mockProvider.request as any).mock.calls[0][0];
    expect(calledParams.method).toBe('wallet_sendCalls');
  });
});

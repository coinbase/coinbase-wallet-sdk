import { ProviderInterface } from ':core/provider/interface.js';
import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SpendPermissionTypedData,
  createSpendPermissionTypedData,
  dateToTimestampInSeconds,
} from '../utils.js';
import { getHash } from './getHash.js';
import {
  RequestSpendPermissionType,
  WalletSignCapabilities,
  requestSpendPermission,
} from './requestSpendPermission.js';

vi.mock('../utils.js', () => ({
  createSpendPermissionTypedData: vi.fn(),
  dateToTimestampInSeconds: vi.fn(),
}));

vi.mock('./getHash.js', () => ({
  getHash: vi.fn(),
}));

describe('requestSpendPermission', () => {
  let mockProvider: ProviderInterface;
  let mockProviderRequest: ReturnType<typeof vi.fn>;
  let mockTypedData: SpendPermissionTypedData;
  let mockRequestData: RequestSpendPermissionType & { provider: ProviderInterface };

  const mockSignature =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
  const mockPermissionHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  const mockTimestamp = 1234567890;

  beforeEach(() => {
    vi.clearAllMocks();
    (dateToTimestampInSeconds as Mock).mockReturnValue(mockTimestamp);

    mockProviderRequest = vi.fn();
    mockProvider = {
      request: mockProviderRequest,
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

    mockRequestData = {
      account: '0x1234567890abcdef1234567890abcdef12345678',
      spender: '0x5678901234567890abcdef1234567890abcdef12',
      token: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      chainId: 8453,
      allowance: BigInt('1000000000000000000'),
      periodInDays: 30,
      start: new Date(1234567890000),
      end: new Date(1234654290000),
      salt: '123456789',
      extraData: '0x',
      provider: mockProvider,
    };

    mockTypedData = {
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
        account: mockRequestData.account as `0x${string}`,
        spender: mockRequestData.spender as `0x${string}`,
        token: mockRequestData.token as `0x${string}`,
        allowance: mockRequestData.allowance.toString(),
        period: 86400 * mockRequestData.periodInDays,
        start: Math.floor(mockRequestData.start!.getTime() / 1000),
        end: Math.floor(mockRequestData.end!.getTime() / 1000),
        salt: mockRequestData.salt!,
        extraData: mockRequestData.extraData! as `0x${string}`,
      },
    };
  });

  describe('successful requests', () => {
    it('should create spend permission successfully', async () => {
      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue(mockSignature);
      (getHash as Mock).mockResolvedValue(mockPermissionHash);

      const result = await requestSpendPermission(mockRequestData);

      const expectedPermission: SpendPermission = {
        createdAt: mockTimestamp,
        permissionHash: mockPermissionHash,
        signature: mockSignature,
        chainId: mockRequestData.chainId,
        permission: mockTypedData.message,
      };

      expect(result).toEqual(expectedPermission);
      expect(createSpendPermissionTypedData).toHaveBeenCalledWith(mockRequestData);
      expect(mockProviderRequest).toHaveBeenCalledWith({
        method: 'eth_signTypedData_v4',
        params: [mockRequestData.account, mockTypedData],
      });
      expect(getHash).toHaveBeenCalledWith({
        permission: mockTypedData.message,
        chainId: mockRequestData.chainId,
      });
      expect(dateToTimestampInSeconds).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should handle different chain IDs correctly', async () => {
      const testChainIds = [1, 8453, 137, 42161];

      for (const chainId of testChainIds) {
        vi.clearAllMocks();
        (dateToTimestampInSeconds as Mock).mockReturnValue(mockTimestamp);
        (createSpendPermissionTypedData as Mock).mockReturnValue({
          ...mockTypedData,
          domain: { ...mockTypedData.domain, chainId },
        });
        (mockProviderRequest as Mock).mockResolvedValue(mockSignature);
        (getHash as Mock).mockResolvedValue(mockPermissionHash);

        const testRequest = { ...mockRequestData, chainId };
        const result = await requestSpendPermission(testRequest);

        expect(result.chainId).toBe(chainId);
        expect(getHash).toHaveBeenCalledWith({ permission: expect.any(Object), chainId });
      }
    });
  });

  describe('parameter handling', () => {
    it('should handle large allowance values', async () => {
      const largeAllowanceRequest = {
        ...mockRequestData,
        allowance: BigInt('999999999999999999999999999999'),
      };

      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue(mockSignature);
      (getHash as Mock).mockResolvedValue(mockPermissionHash);

      const result = await requestSpendPermission(largeAllowanceRequest);

      expect(result).toBeDefined();
      expect(createSpendPermissionTypedData).toHaveBeenCalledWith(largeAllowanceRequest);
    });

    it('should handle zero allowance', async () => {
      const zeroAllowanceRequest = {
        ...mockRequestData,
        allowance: BigInt(0),
      };

      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue(mockSignature);
      (getHash as Mock).mockResolvedValue(mockPermissionHash);

      const result = await requestSpendPermission(zeroAllowanceRequest);

      expect(result).toBeDefined();
      expect(createSpendPermissionTypedData).toHaveBeenCalledWith(zeroAllowanceRequest);
    });

    it('should pass through extraData correctly', async () => {
      const extraDataRequest = {
        ...mockRequestData,
        extraData: '0x1234abcd5678ef90',
      };

      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue(mockSignature);
      (getHash as Mock).mockResolvedValue(mockPermissionHash);

      await requestSpendPermission(extraDataRequest);

      expect(createSpendPermissionTypedData).toHaveBeenCalledWith(extraDataRequest);
    });
  });

  describe('error handling', () => {
    it('should propagate provider signature errors', async () => {
      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockRejectedValue(new Error('User rejected signature'));
      (getHash as Mock).mockResolvedValue(mockPermissionHash);

      await expect(requestSpendPermission(mockRequestData)).rejects.toThrow(
        'User rejected signature'
      );

      expect(createSpendPermissionTypedData).toHaveBeenCalledWith(mockRequestData);
      expect(mockProviderRequest).toHaveBeenCalled();
    });

    it('should propagate getHash errors', async () => {
      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue(mockSignature);
      (getHash as Mock).mockRejectedValue(new Error('Failed to get hash'));

      await expect(requestSpendPermission(mockRequestData)).rejects.toThrow('Failed to get hash');

      expect(createSpendPermissionTypedData).toHaveBeenCalledWith(mockRequestData);
      expect(getHash).toHaveBeenCalledWith({
        permission: mockTypedData.message,
        chainId: mockRequestData.chainId,
      });
    });

    it('should handle RPC errors from provider', async () => {
      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      const rpcError = {
        code: -32603,
        message: 'Internal error',
      };
      (mockProviderRequest as Mock).mockRejectedValue(rpcError);
      (getHash as Mock).mockResolvedValue(mockPermissionHash);

      await expect(requestSpendPermission(mockRequestData)).rejects.toEqual(rpcError);
    });

    it('should handle createSpendPermissionTypedData errors', async () => {
      (createSpendPermissionTypedData as Mock).mockImplementation(() => {
        throw new Error('Invalid request parameters');
      });

      await expect(requestSpendPermission(mockRequestData)).rejects.toThrow(
        'Invalid request parameters'
      );

      expect(createSpendPermissionTypedData).toHaveBeenCalledWith(mockRequestData);
      expect(mockProviderRequest).not.toHaveBeenCalled();
      expect(getHash).not.toHaveBeenCalled();
    });

    it('should handle both signature and hash failures', async () => {
      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockRejectedValue(new Error('Signature failed'));
      (getHash as Mock).mockRejectedValue(new Error('Hash failed'));

      // Promise.all should reject with the first error that occurs
      await expect(requestSpendPermission(mockRequestData)).rejects.toThrow();

      expect(createSpendPermissionTypedData).toHaveBeenCalledWith(mockRequestData);
    });
  });

  describe('capabilities support', () => {
    it('should use wallet_sign when capabilities are provided', async () => {
      const capabilities: WalletSignCapabilities = {
        spendPermission: {
          requireBalance: true,
        },
      };

      const mockWalletSignResponse = {
        signature: mockSignature,
        signedData: mockTypedData,
      };

      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue(mockWalletSignResponse);
      (getHash as Mock).mockResolvedValue(mockPermissionHash);

      const requestWithCapabilities = {
        ...mockRequestData,
        capabilities,
      };

      const result = await requestSpendPermission(requestWithCapabilities);

      expect(createSpendPermissionTypedData).toHaveBeenCalledWith(requestWithCapabilities);
      expect(mockProviderRequest).toHaveBeenCalledWith({
        method: 'wallet_sign',
        params: [
          {
            version: '1.0',
            request: {
              type: '0x01',
              data: mockTypedData,
            },
            mutableData: {
              fields: ['message.account'],
            },
            capabilities,
          },
        ],
      });
      expect(getHash).toHaveBeenCalledWith({
        permission: mockTypedData.message,
        chainId: mockRequestData.chainId,
      });
      expect(result).toEqual<SpendPermission>({
        createdAt: mockTimestamp,
        permissionHash: mockPermissionHash,
        signature: mockSignature,
        chainId: mockRequestData.chainId,
        permission: mockTypedData.message,
      });
    });

    it('should handle invalid wallet_sign response', async () => {
      const capabilities: WalletSignCapabilities = {
        spendPermission: {
          requireBalance: true,
        },
      };

      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue('invalid response');

      const requestWithCapabilities = {
        ...mockRequestData,
        capabilities,
      };

      await expect(requestSpendPermission(requestWithCapabilities)).rejects.toThrow(
        'Invalid response from wallet_sign: expected object but got string'
      );
    });

    it('should handle missing signature in wallet_sign response', async () => {
      const capabilities: WalletSignCapabilities = {
        spendPermission: {
          requireBalance: true,
        },
      };

      const invalidResponse = {
        signedData: mockTypedData,
        // missing signature
      };

      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue(invalidResponse);

      const requestWithCapabilities = {
        ...mockRequestData,
        capabilities,
      };

      await expect(requestSpendPermission(requestWithCapabilities)).rejects.toThrow(
        'Invalid response from wallet_sign: missing signature'
      );
    });

    it('should use eth_signTypedData_v4 when capabilities are not provided', async () => {
      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue(mockSignature);
      (getHash as Mock).mockResolvedValue(mockPermissionHash);

      const result = await requestSpendPermission(mockRequestData);

      expect(mockProviderRequest).toHaveBeenCalledWith({
        method: 'eth_signTypedData_v4',
        params: [mockRequestData.account, mockTypedData],
      });
      expect(mockProviderRequest).not.toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'wallet_sign',
        })
      );
      expect(result.signature).toBe(mockSignature);
    });
  });

  describe('return value structure', () => {
    it('should return correct SpendPermission structure', async () => {
      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue(mockSignature);
      (getHash as Mock).mockResolvedValue(mockPermissionHash);

      const result = await requestSpendPermission(mockRequestData);

      expect(result).toBeDefined();
      expect(typeof result.createdAt).toBe('number');
      expect(typeof result.permissionHash).toBe('string');
      expect(typeof result.signature).toBe('string');
      expect(typeof result.chainId).toBe('number');
      expect(typeof result.permission).toBe('object');

      expect(result.createdAt).toBe(mockTimestamp);
      expect(result.permissionHash).toBe(mockPermissionHash);
      expect(result.signature).toBe(mockSignature);
      expect(result.chainId).toBe(mockRequestData.chainId);
      expect(result.permission).toBe(mockTypedData.message);
    });

    it('should include all permission message fields', async () => {
      (createSpendPermissionTypedData as Mock).mockReturnValue(mockTypedData);
      (mockProviderRequest as Mock).mockResolvedValue(mockSignature);
      (getHash as Mock).mockResolvedValue(mockPermissionHash);

      const result = await requestSpendPermission(mockRequestData);

      expect(result.permission.account).toBeDefined();
      expect(result.permission.spender).toBeDefined();
      expect(result.permission.token).toBeDefined();
      expect(result.permission.allowance).toBeDefined();
      expect(result.permission.period).toBeDefined();
      expect(result.permission.start).toBeDefined();
      expect(result.permission.end).toBeDefined();
      expect(result.permission.salt).toBeDefined();
      expect(result.permission.extraData).toBeDefined();

      expect(typeof result.permission.account).toBe('string');
      expect(typeof result.permission.spender).toBe('string');
      expect(typeof result.permission.token).toBe('string');
      expect(typeof result.permission.allowance).toBe('string');
      expect(typeof result.permission.period).toBe('number');
      expect(typeof result.permission.start).toBe('number');
      expect(typeof result.permission.end).toBe('number');
      expect(typeof result.permission.salt).toBe('string');
      expect(typeof result.permission.extraData).toBe('string');
    });
  });
});

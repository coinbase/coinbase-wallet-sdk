import { CdpClient } from '@coinbase/cdp-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateSubscriptionOwnerWallet } from './getOrCreateSubscriptionOwnerWallet.js';
import type { GetOrCreateSubscriptionOwnerWalletOptions } from './types.js';

// Mock the CDP SDK
vi.mock('@coinbase/cdp-sdk', () => ({
  CdpClient: vi.fn(),
}));

describe('getOrCreateSubscriptionOwnerWallet', () => {
  let mockCdpClient: any;
  let mockEoaAccount: any;
  let mockSmartAccount: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock EOA account
    mockEoaAccount = {
      address: '0x1234567890123456789012345678901234567890',
    };

    // Setup mock smart account
    mockSmartAccount = {
      address: '0xabcdef1234567890123456789012345678901234',
    };

    // Setup mock CDP client
    mockCdpClient = {
      evm: {
        getOrCreateAccount: vi.fn().mockResolvedValue(mockEoaAccount),
        getOrCreateSmartAccount: vi.fn().mockResolvedValue(mockSmartAccount),
      },
    };

    // Mock the CdpClient constructor
    (CdpClient as any).mockImplementation(() => mockCdpClient);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.CDP_API_KEY_ID;
    delete process.env.CDP_API_KEY_SECRET;
    delete process.env.CDP_WALLET_SECRET;
  });

  describe('successful smart wallet creation/retrieval', () => {
    it('should create a smart wallet with default name', async () => {
      const result = await getOrCreateSubscriptionOwnerWallet({
        cdpApiKeyId: 'test-key-id',
        cdpApiKeySecret: 'test-key-secret',
        cdpWalletSecret: 'test-wallet-secret',
      });

      expect(result).toEqual({
        address: '0xabcdef1234567890123456789012345678901234',
        walletName: 'subscription owner',
        eoaAddress: '0x1234567890123456789012345678901234567890',
      });

      expect(CdpClient).toHaveBeenCalledWith({
        apiKeyId: 'test-key-id',
        apiKeySecret: 'test-key-secret',
        walletSecret: 'test-wallet-secret',
      });

      expect(mockCdpClient.evm.getOrCreateAccount).toHaveBeenCalledWith({
        name: 'subscription owner',
      });

      expect(mockCdpClient.evm.getOrCreateSmartAccount).toHaveBeenCalledWith({
        name: 'subscription owner',
        owner: mockEoaAccount,
      });
    });

    it('should retrieve an existing smart wallet', async () => {
      const result = await getOrCreateSubscriptionOwnerWallet({
        cdpApiKeyId: 'test-key-id',
        cdpApiKeySecret: 'test-key-secret',
        cdpWalletSecret: 'test-wallet-secret',
      });

      expect(result).toEqual({
        address: '0xabcdef1234567890123456789012345678901234',
        walletName: 'subscription owner',
        eoaAddress: '0x1234567890123456789012345678901234567890',
      });
    });

    it('should use custom wallet name', async () => {
      const result = await getOrCreateSubscriptionOwnerWallet({
        cdpApiKeyId: 'test-key-id',
        cdpApiKeySecret: 'test-key-secret',
        cdpWalletSecret: 'test-wallet-secret',
        walletName: 'custom-wallet-name',
      });

      expect(result).toEqual({
        address: '0xabcdef1234567890123456789012345678901234',
        walletName: 'custom-wallet-name',
        eoaAddress: '0x1234567890123456789012345678901234567890',
      });

      expect(mockCdpClient.evm.getOrCreateAccount).toHaveBeenCalledWith({
        name: 'custom-wallet-name',
      });

      expect(mockCdpClient.evm.getOrCreateSmartAccount).toHaveBeenCalledWith({
        name: 'custom-wallet-name',
        owner: mockEoaAccount,
      });
    });

    it('should use environment variables when credentials not provided', async () => {
      process.env.CDP_API_KEY_ID = 'env-key-id';
      process.env.CDP_API_KEY_SECRET = 'env-key-secret';
      process.env.CDP_WALLET_SECRET = 'env-wallet-secret';

      mockCdpClient.evm.getOrCreateAccount.mockResolvedValue(mockEoaAccount);

      const result = await getOrCreateSubscriptionOwnerWallet();

      expect(result).toEqual({
        address: '0xabcdef1234567890123456789012345678901234',
        walletName: 'subscription owner',
        eoaAddress: '0x1234567890123456789012345678901234567890',
      });

      // When no options are provided, undefined values are passed to CdpClient
      // The CdpClient internally falls back to environment variables
      expect(CdpClient).toHaveBeenCalledWith({
        apiKeyId: undefined,
        apiKeySecret: undefined,
        walletSecret: undefined,
      });
    });

    it('should prefer explicit credentials over environment variables', async () => {
      process.env.CDP_API_KEY_ID = 'env-key-id';
      process.env.CDP_API_KEY_SECRET = 'env-key-secret';
      process.env.CDP_WALLET_SECRET = 'env-wallet-secret';

      mockCdpClient.evm.getOrCreateAccount.mockResolvedValue(mockEoaAccount);

      await getOrCreateSubscriptionOwnerWallet({
        cdpApiKeyId: 'explicit-key-id',
        cdpApiKeySecret: 'explicit-key-secret',
        cdpWalletSecret: 'explicit-wallet-secret',
      });

      expect(CdpClient).toHaveBeenCalledWith({
        apiKeyId: 'explicit-key-id',
        apiKeySecret: 'explicit-key-secret',
        walletSecret: 'explicit-wallet-secret',
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when CDP client initialization fails', async () => {
      const initError = new Error('Missing required CDP Secret API Key configuration parameters');
      (CdpClient as any).mockImplementation(() => {
        throw initError;
      });

      await expect(
        getOrCreateSubscriptionOwnerWallet({
          // Missing credentials
        })
      ).rejects.toThrow(/Failed to initialize CDP client/);
    });

    it('should throw error when wallet creation fails', async () => {
      const createError = new Error('API error');
      mockCdpClient.evm.getOrCreateAccount.mockRejectedValue(createError);

      await expect(
        getOrCreateSubscriptionOwnerWallet({
          cdpApiKeyId: 'test-key-id',
          cdpApiKeySecret: 'test-key-secret',
          cdpWalletSecret: 'test-wallet-secret',
        })
      ).rejects.toThrow(/Failed to get or create subscription owner smart wallet/);
    });

    it('should handle CDP API errors gracefully', async () => {
      const apiError = new Error('Network error');
      mockCdpClient.evm.getOrCreateAccount.mockRejectedValue(apiError);

      await expect(
        getOrCreateSubscriptionOwnerWallet({
          cdpApiKeyId: 'test-key-id',
          cdpApiKeySecret: 'test-key-secret',
          cdpWalletSecret: 'test-wallet-secret',
          walletName: 'test-wallet',
        })
      ).rejects.toThrow(
        'Failed to get or create subscription owner smart wallet "test-wallet": Network error'
      );
    });
  });

  describe('idempotency', () => {
    it('should return the same wallet when called multiple times', async () => {
      mockCdpClient.evm.getOrCreateAccount.mockResolvedValue(mockEoaAccount);

      const options: GetOrCreateSubscriptionOwnerWalletOptions = {
        cdpApiKeyId: 'test-key-id',
        cdpApiKeySecret: 'test-key-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      const result1 = await getOrCreateSubscriptionOwnerWallet(options);
      const result2 = await getOrCreateSubscriptionOwnerWallet(options);

      expect(result1.address).toBe(result2.address);
      expect(result1.walletName).toBe(result2.walletName);
      expect(mockCdpClient.evm.getOrCreateAccount).toHaveBeenCalledTimes(2);
    });
  });
});

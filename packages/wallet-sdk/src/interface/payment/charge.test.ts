import { beforeEach, describe, expect, it, vi } from 'vitest';
import { charge } from './charge.js';
import * as prepareChargeModule from './prepareCharge.js';

// Mock the CDP SDK
vi.mock('@coinbase/cdp-sdk', () => ({
  CdpClient: vi.fn(),
}));

// Mock prepareCharge
vi.mock('./prepareCharge.js', () => ({
  prepareCharge: vi.fn(),
}));

// Import the mocked CDP SDK
import { CdpClient } from '@coinbase/cdp-sdk';

describe('charge', () => {
  const mockEoaAccount = {
    address: '0x1234567890123456789012345678901234567890',
  };

  const mockSmartAccount = {
    address: '0xabcdef1234567890123456789012345678901234',
    useNetwork: vi.fn(),
  };

  const mockNetworkSmartAccount = {
    sendUserOperation: vi.fn(),
    waitForUserOperation: vi.fn(),
  };

  const mockCdpClient = {
    evm: {
      getAccount: vi.fn(),
      getSmartAccount: vi.fn(),
      sendUserOperation: vi.fn(),
    },
  };

  const mockChargeCalls = [
    {
      to: '0xabc123' as any,
      data: '0xdef456' as any,
      value: 0n,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    (CdpClient as any).mockImplementation(() => mockCdpClient);
    mockCdpClient.evm.getAccount.mockResolvedValue(mockEoaAccount);
    mockCdpClient.evm.getSmartAccount.mockResolvedValue(mockSmartAccount);
    mockSmartAccount.useNetwork.mockResolvedValue(mockNetworkSmartAccount);
    mockNetworkSmartAccount.sendUserOperation.mockResolvedValue({
      smartAccountAddress: mockSmartAccount.address,
      status: 'broadcast',
      userOpHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
    });
    mockNetworkSmartAccount.waitForUserOperation.mockResolvedValue({
      smartAccountAddress: mockSmartAccount.address,
      status: 'complete',
      userOpHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
      transactionHash: '0xabcdef1234567890123456789012345678901234567890123456789012345678',
    });
    mockCdpClient.evm.sendUserOperation.mockResolvedValue({
      smartAccountAddress: mockSmartAccount.address,
      status: 'broadcast',
      userOpHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
    });
    (prepareChargeModule.prepareCharge as any).mockResolvedValue(mockChargeCalls);
  });

  describe('successful charge', () => {
    it('should charge a subscription with explicit credentials', async () => {
      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      const result = await charge(options);

      // Verify CDP client initialization
      expect(CdpClient).toHaveBeenCalledWith({
        apiKeyId: 'test-api-key',
        apiKeySecret: 'test-api-secret',
        walletSecret: 'test-wallet-secret',
      });

      // Verify EOA account retrieval
      expect(mockCdpClient.evm.getAccount).toHaveBeenCalledWith({
        name: 'subscription owner',
      });

      // Verify smart account retrieval
      expect(mockCdpClient.evm.getSmartAccount).toHaveBeenCalledWith({
        name: 'subscription owner',
        owner: mockEoaAccount,
      });

      // Verify charge preparation (spender bound to CDP smart wallet)
      expect(prepareChargeModule.prepareCharge).toHaveBeenCalledWith({
        id: options.id,
        amount: options.amount,
        testnet: options.testnet,
        recipient: undefined,
        rpcUrl: undefined,
        expectedSpender: mockSmartAccount.address,
        expectedPayer: undefined,
      });

      // Verify network selection
      expect(mockSmartAccount.useNetwork).toHaveBeenCalledWith('base');

      // Verify user operation execution
      expect(mockNetworkSmartAccount.sendUserOperation).toHaveBeenCalledWith({
        calls: [
          {
            to: mockChargeCalls[0].to,
            data: mockChargeCalls[0].data,
            value: BigInt(mockChargeCalls[0].value),
          },
        ],
      });

      // Verify wait for user operation
      expect(mockNetworkSmartAccount.waitForUserOperation).toHaveBeenCalledWith({
        userOpHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
        waitOptions: {
          timeoutSeconds: 60,
        },
      });

      // Verify result
      expect(result).toEqual({
        success: true,
        id: '0xabcdef1234567890123456789012345678901234567890123456789012345678',
        subscriptionId: options.id,
        amount: options.amount,
        subscriptionOwner: mockSmartAccount.address,
      });
    });

    it('should charge a subscription on testnet', async () => {
      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '5.00',
        testnet: true,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await charge(options);

      // Verify testnet network selection
      expect(mockSmartAccount.useNetwork).toHaveBeenCalledWith('base-sepolia');
    });

    it('should charge max remaining amount', async () => {
      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: 'max-remaining-charge',
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      const result = await charge(options);

      expect(prepareChargeModule.prepareCharge).toHaveBeenCalledWith({
        id: options.id,
        amount: 'max-remaining-charge',
        testnet: options.testnet,
        recipient: undefined,
        rpcUrl: undefined,
        expectedSpender: mockSmartAccount.address,
        expectedPayer: undefined,
      });

      expect(result.amount).toBe('max');
    });

    it('should use custom wallet name', async () => {
      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '10.00',
        testnet: false,
        walletName: 'my-custom-wallet',
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await charge(options);

      expect(mockCdpClient.evm.getAccount).toHaveBeenCalledWith({
        name: 'my-custom-wallet',
      });
    });

    it('should execute multiple charge calls in a single user operation', async () => {
      const multipleChargeCalls = [
        {
          to: '0xabc123' as any,
          data: '0xdef456' as any,
          value: 0n,
        },
        {
          to: '0xfed321' as any,
          data: '0xcba987' as any,
          value: 0n,
        },
      ];

      (prepareChargeModule.prepareCharge as any).mockResolvedValue(multipleChargeCalls);

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '15.00',
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await charge(options);

      // Verify all calls were batched in a single user operation
      expect(mockNetworkSmartAccount.sendUserOperation).toHaveBeenCalledTimes(1);
      expect(mockNetworkSmartAccount.sendUserOperation).toHaveBeenCalledWith({
        calls: [
          {
            to: multipleChargeCalls[0].to,
            data: multipleChargeCalls[0].data,
            value: BigInt(multipleChargeCalls[0].value),
          },
          {
            to: multipleChargeCalls[1].to,
            data: multipleChargeCalls[1].data,
            value: BigInt(multipleChargeCalls[1].value),
          },
        ],
      });
    });

    it('should charge and transfer to recipient when provided', async () => {
      const recipientAddress = '0x0000000000000000000000000000000000000001';
      const mockChargeCallsWithTransfer = [
        ...mockChargeCalls,
        {
          to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as any, // USDC address
          data: '0xtransferData' as any,
          value: 0n,
        },
      ];

      // Mock prepareCharge to return calls including the transfer
      (prepareChargeModule.prepareCharge as any).mockResolvedValue(mockChargeCallsWithTransfer);

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '10.00',
        recipient: recipientAddress as any,
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      const result = await charge(options);

      // Verify prepareCharge was called with recipient
      expect(prepareChargeModule.prepareCharge).toHaveBeenCalledWith({
        id: options.id,
        amount: options.amount,
        testnet: options.testnet,
        recipient: recipientAddress,
        rpcUrl: undefined,
        expectedSpender: mockSmartAccount.address,
        expectedPayer: undefined,
      });

      // Verify that sendUserOperation was called with all calls from prepareCharge
      expect(mockNetworkSmartAccount.sendUserOperation).toHaveBeenCalledWith({
        calls: mockChargeCallsWithTransfer.map((call) => ({
          to: call.to,
          data: call.data,
          value: BigInt(call.value),
        })),
      });

      // Verify result includes recipient
      expect(result).toEqual({
        success: true,
        id: '0xabcdef1234567890123456789012345678901234567890123456789012345678',
        subscriptionId: options.id,
        amount: options.amount,
        subscriptionOwner: mockSmartAccount.address,
        recipient: recipientAddress,
      });
    });

    it('should charge and transfer to recipient on testnet', async () => {
      const recipientAddress = '0x0000000000000000000000000000000000000001';
      const mockChargeCallsWithTransfer = [
        ...mockChargeCalls,
        {
          to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as any, // USDC testnet address
          data: '0xtransferData' as any,
          value: 0n,
        },
      ];

      // Mock prepareCharge to return calls including the transfer
      (prepareChargeModule.prepareCharge as any).mockResolvedValue(mockChargeCallsWithTransfer);

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '5.00',
        recipient: recipientAddress as any,
        testnet: true,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await charge(options);

      // Verify prepareCharge was called with recipient
      expect(prepareChargeModule.prepareCharge).toHaveBeenCalledWith({
        id: options.id,
        amount: options.amount,
        testnet: options.testnet,
        recipient: recipientAddress,
        rpcUrl: undefined,
        expectedSpender: mockSmartAccount.address,
        expectedPayer: undefined,
      });

      // Verify testnet network selection
      expect(mockSmartAccount.useNetwork).toHaveBeenCalledWith('base-sepolia');
    });

    it('should handle recipient with max-remaining-charge', async () => {
      const recipientAddress = '0x0000000000000000000000000000000000000001';
      const mockChargeCallsWithTransfer = [
        ...mockChargeCalls,
        {
          to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as any, // USDC address
          data: '0xtransferData' as any,
          value: 0n,
        },
      ];

      // Mock prepareCharge to return calls including the transfer
      (prepareChargeModule.prepareCharge as any).mockResolvedValue(mockChargeCallsWithTransfer);

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: 'max-remaining-charge',
        recipient: recipientAddress as any,
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      const result = await charge(options);

      // Verify prepareCharge was called with recipient and max-remaining-charge
      expect(prepareChargeModule.prepareCharge).toHaveBeenCalledWith({
        id: options.id,
        amount: 'max-remaining-charge',
        testnet: options.testnet,
        recipient: recipientAddress,
        rpcUrl: undefined,
        expectedSpender: mockSmartAccount.address,
        expectedPayer: undefined,
      });

      // Verify result
      expect(result).toEqual({
        success: true,
        id: '0xabcdef1234567890123456789012345678901234567890123456789012345678',
        subscriptionId: options.id,
        amount: 'max',
        subscriptionOwner: mockSmartAccount.address,
        recipient: recipientAddress,
      });
    });

    it('should pass rpcUrl to prepareCharge when provided', async () => {
      const customRpcUrl = 'https://my-custom-rpc.example.com';
      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        rpcUrl: customRpcUrl,
      };

      const result = await charge(options);

      // Verify prepareCharge was called with custom rpcUrl
      expect(prepareChargeModule.prepareCharge).toHaveBeenCalledWith({
        id: options.id,
        amount: options.amount,
        testnet: options.testnet,
        recipient: undefined,
        rpcUrl: customRpcUrl,
        expectedSpender: mockSmartAccount.address,
        expectedPayer: undefined,
      });

      // Verify result
      expect(result).toEqual({
        success: true,
        id: '0xabcdef1234567890123456789012345678901234567890123456789012345678',
        subscriptionId: options.id,
        amount: options.amount,
        subscriptionOwner: mockSmartAccount.address,
      });
    });

    it('should pass expectedPayer through to prepareCharge', async () => {
      const expectedPayer = '0x1111111111111111111111111111111111111111';
      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        expectedPayer: expectedPayer as any,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await charge(options);

      expect(prepareChargeModule.prepareCharge).toHaveBeenCalledWith({
        id: options.id,
        amount: options.amount,
        testnet: options.testnet,
        recipient: undefined,
        rpcUrl: undefined,
        expectedSpender: mockSmartAccount.address,
        expectedPayer,
      });
    });
  });

  describe('error handling', () => {
    it('should reject when expectedSpender does not match the charging wallet', async () => {
      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        expectedSpender: '0x3333333333333333333333333333333333333333' as any,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await expect(charge(options)).rejects.toThrow(
        `expectedSpender ${options.expectedSpender} does not match charging wallet ${mockSmartAccount.address}`
      );
      expect(prepareChargeModule.prepareCharge).not.toHaveBeenCalled();
    });

    it('should throw error when CDP credentials are missing', async () => {
      (CdpClient as any).mockImplementation(() => {
        throw new Error('Missing required API credentials');
      });

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
      };

      await expect(charge(options)).rejects.toThrow(
        'Failed to initialize CDP client for subscription charge'
      );
    });

    it('should throw error when wallet not found', async () => {
      mockCdpClient.evm.getAccount.mockResolvedValue(null);

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await expect(charge(options)).rejects.toThrow('EOA wallet "subscription owner" not found');
    });

    it('should throw error when smart wallet not found', async () => {
      mockCdpClient.evm.getSmartAccount.mockResolvedValue(null);

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await expect(charge(options)).rejects.toThrow('Smart wallet "subscription owner" not found');
    });

    it('should throw error when charge preparation fails', async () => {
      (prepareChargeModule.prepareCharge as any).mockRejectedValue(
        new Error('Subscription not found')
      );

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await expect(charge(options)).rejects.toThrow('Subscription not found');
    });

    it('should throw error when user operation execution fails', async () => {
      mockNetworkSmartAccount.sendUserOperation.mockRejectedValue(new Error('Insufficient funds'));

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await expect(charge(options)).rejects.toThrow(
        'Failed to execute charge transaction with smart wallet: Insufficient funds'
      );
    });

    it('should throw error when user operation fails', async () => {
      mockNetworkSmartAccount.waitForUserOperation.mockResolvedValue({
        smartAccountAddress: mockSmartAccount.address,
        status: 'failed',
        userOpHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
      });

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await expect(charge(options)).rejects.toThrow(
        'User operation failed: 0x9876543210987654321098765432109876543210987654321098765432109876'
      );
    });
  });

  describe('environment variables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use environment variables for CDP credentials', async () => {
      process.env.CDP_API_KEY_ID = 'env-api-key';
      process.env.CDP_API_KEY_SECRET = 'env-api-secret';
      process.env.CDP_WALLET_SECRET = 'env-wallet-secret';

      // Re-mock CdpClient to accept env vars
      (CdpClient as any).mockImplementation(() => mockCdpClient);

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
      };

      await charge(options);

      expect(CdpClient).toHaveBeenCalledWith({
        apiKeyId: undefined,
        apiKeySecret: undefined,
        walletSecret: undefined,
      });
    });

    it('should use environment variable for paymaster URL', async () => {
      process.env.PAYMASTER_URL = 'https://paymaster.example.com';

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await charge(options);

      // Verify paymaster URL was passed to sendUserOperation
      expect(mockNetworkSmartAccount.sendUserOperation).toHaveBeenCalledWith({
        calls: expect.any(Array),
        paymasterUrl: 'https://paymaster.example.com',
      });
    });

    it('should override environment variable with explicit paymaster URL', async () => {
      process.env.PAYMASTER_URL = 'https://env-paymaster.example.com';

      const options = {
        id: '0x71319cd488f8e4f24687711ec5c95d9e0c1bacbf5c1064942937eba4c7cf2984',
        amount: '9.99',
        testnet: false,
        paymasterUrl: 'https://explicit-paymaster.example.com',
        cdpApiKeyId: 'test-api-key',
        cdpApiKeySecret: 'test-api-secret',
        cdpWalletSecret: 'test-wallet-secret',
      };

      await charge(options);

      // Verify explicit paymaster URL was used instead of env variable
      expect(mockNetworkSmartAccount.sendUserOperation).toHaveBeenCalledWith({
        calls: expect.any(Array),
        paymasterUrl: 'https://explicit-paymaster.example.com',
      });
    });
  });
});

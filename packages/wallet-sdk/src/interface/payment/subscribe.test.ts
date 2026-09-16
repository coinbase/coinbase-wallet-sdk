import { describe, expect, it, vi } from 'vitest';
import { subscribe } from './subscribe.js';
import type { SubscriptionOptions } from './types.js';

// Mock the dependencies
vi.mock(':core/telemetry/events/subscription.js', () => ({
  logSubscriptionStarted: vi.fn(),
  logSubscriptionCompleted: vi.fn(),
  logSubscriptionError: vi.fn(),
}));

vi.mock('./utils/sdkManager.js', () => ({
  createEphemeralSDK: vi.fn(() => ({
    getProvider: vi.fn(() => ({
      request: vi.fn(),
      disconnect: vi.fn(),
    })),
  })),
}));

vi.mock('../public-utilities/spend-permission/index.js', () => ({
  getHash: vi.fn(() => Promise.resolve('0xmockhash')),
}));

describe('subscribe with requireBalance capability', () => {
  it('should include capabilities when requireBalance is true', async () => {
    const options: SubscriptionOptions = {
      recurringCharge: '10.00',
      subscriptionOwner: '0x1234567890123456789012345678901234567890',
      periodInDays: 30,
      testnet: true,
      requireBalance: true, // Enable balance check
    };

    // Mock the provider response
    const mockProvider = {
      request: vi.fn().mockResolvedValue({
        signature: '0xsignature',
        signedData: {
          message: {
            account: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            spender: '0x1234567890123456789012345678901234567890',
            token: '0xtoken',
            allowance: '10000000',
            period: 2592000, // 30 days in seconds
            start: 1234567890,
            end: 999999999,
            salt: '0xsalt',
            extraData: '0x',
          },
        },
      }),
      disconnect: vi.fn(),
    };

    const { createEphemeralSDK } = await import('./utils/sdkManager.js');
    vi.mocked(createEphemeralSDK).mockReturnValue({
      getProvider: () => mockProvider as any,
    } as any);

    await subscribe(options);

    // Verify wallet_sign was called with capabilities
    expect(mockProvider.request).toHaveBeenCalledWith({
      method: 'wallet_sign',
      params: [
        expect.objectContaining({
          version: '1.0',
          request: expect.any(Object),
          mutableData: expect.any(Object),
          capabilities: {
            spendPermissions: {
              requireBalance: true,
            },
          },
        }),
      ],
    });
  });

  it('should not include capabilities when requireBalance is false', async () => {
    const options: SubscriptionOptions = {
      recurringCharge: '10.00',
      subscriptionOwner: '0x1234567890123456789012345678901234567890',
      periodInDays: 30,
      testnet: true,
      requireBalance: false, // Explicitly disable
    };

    // Mock the provider response
    const mockProvider = {
      request: vi.fn().mockResolvedValue({
        signature: '0xsignature',
        signedData: {
          message: {
            account: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            spender: '0x1234567890123456789012345678901234567890',
            token: '0xtoken',
            allowance: '10000000',
            period: 2592000, // 30 days in seconds
            start: 1234567890,
            end: 999999999,
            salt: '0xsalt',
            extraData: '0x',
          },
        },
      }),
      disconnect: vi.fn(),
    };

    const { createEphemeralSDK } = await import('./utils/sdkManager.js');
    vi.mocked(createEphemeralSDK).mockReturnValue({
      getProvider: () => mockProvider as any,
    } as any);

    await subscribe(options);

    // Verify wallet_sign was called without capabilities
    expect(mockProvider.request).toHaveBeenCalledWith({
      method: 'wallet_sign',
      params: [
        expect.not.objectContaining({
          capabilities: expect.anything(),
        }),
      ],
    });
  });

  it('should include capabilities by default when requireBalance is undefined', async () => {
    const options: SubscriptionOptions = {
      recurringCharge: '10.00',
      subscriptionOwner: '0x1234567890123456789012345678901234567890',
      periodInDays: 30,
      testnet: true,
      // requireBalance not specified - should default to true
    };

    // Mock the provider response
    const mockProvider = {
      request: vi.fn().mockResolvedValue({
        signature: '0xsignature',
        signedData: {
          message: {
            account: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            spender: '0x1234567890123456789012345678901234567890',
            token: '0xtoken',
            allowance: '10000000',
            period: 2592000, // 30 days in seconds
            start: 1234567890,
            end: 999999999,
            salt: '0xsalt',
            extraData: '0x',
          },
        },
      }),
      disconnect: vi.fn(),
    };

    const { createEphemeralSDK } = await import('./utils/sdkManager.js');
    vi.mocked(createEphemeralSDK).mockReturnValue({
      getProvider: () => mockProvider as any,
    } as any);

    await subscribe(options);

    // Verify wallet_sign was called with capabilities (default behavior)
    expect(mockProvider.request).toHaveBeenCalledWith({
      method: 'wallet_sign',
      params: [
        expect.objectContaining({
          version: '1.0',
          request: expect.any(Object),
          mutableData: expect.any(Object),
          capabilities: {
            spendPermissions: {
              requireBalance: true,
            },
          },
        }),
      ],
    });
  });
});

describe('subscribe with overridePeriodInSecondsForTestnet', () => {
  it('should throw error when overridePeriodInSecondsForTestnet is used without testnet', async () => {
    const options = {
      recurringCharge: '10.00',
      subscriptionOwner: '0x1234567890123456789012345678901234567890',
      overridePeriodInSecondsForTestnet: 300, // 5 minutes
      testnet: false, // This should cause an error
    } as any; // Use 'as any' to bypass TypeScript's discriminated union check for testing

    await expect(subscribe(options)).rejects.toThrow(
      'overridePeriodInSecondsForTestnet is only available for testing on testnet'
    );
  });

  it('should accept overridePeriodInSecondsForTestnet when testnet is true and include it in result', async () => {
    const options: SubscriptionOptions = {
      recurringCharge: '0.01',
      subscriptionOwner: '0x1234567890123456789012345678901234567890',
      overridePeriodInSecondsForTestnet: 300, // 5 minutes for testing
      testnet: true, // Required for overridePeriodInSecondsForTestnet
    };

    // Mock the provider response
    const mockProvider = {
      request: vi.fn().mockResolvedValue({
        signature: '0xsignature',
        signedData: {
          message: {
            account: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            spender: '0x1234567890123456789012345678901234567890',
            token: '0xtoken',
            allowance: '10000',
            period: 300, // Should be 300 seconds, not converted to days
            start: 1234567890,
            end: 999999999,
            salt: '0xsalt',
            extraData: '0x',
          },
        },
      }),
      disconnect: vi.fn(),
    };

    const { createEphemeralSDK } = await import('./utils/sdkManager.js');
    vi.mocked(createEphemeralSDK).mockReturnValue({
      getProvider: () => mockProvider as any,
    } as any);

    const result = await subscribe(options);

    // Verify the result includes overridePeriodInSecondsForTestnet
    expect(result).toBeDefined();
    expect(result.overridePeriodInSecondsForTestnet).toBe(300);
    expect(result.periodInDays).toBe(1); // 300 seconds = 5 minutes = ceil(300/86400) = 1 day
  });

  it('should use periodInDays when overridePeriodInSecondsForTestnet is not provided on testnet', async () => {
    const options: SubscriptionOptions = {
      recurringCharge: '10.00',
      subscriptionOwner: '0x1234567890123456789012345678901234567890',
      periodInDays: 7, // Weekly subscription
      testnet: true,
    };

    // Mock the provider response
    const mockProvider = {
      request: vi.fn().mockResolvedValue({
        signature: '0xsignature',
        signedData: {
          message: {
            account: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            spender: '0x1234567890123456789012345678901234567890',
            token: '0xtoken',
            allowance: '10000000',
            period: 604800, // 7 days in seconds
            start: 1234567890,
            end: 999999999,
            salt: '0xsalt',
            extraData: '0x',
          },
        },
      }),
      disconnect: vi.fn(),
    };

    const { createEphemeralSDK } = await import('./utils/sdkManager.js');
    vi.mocked(createEphemeralSDK).mockReturnValue({
      getProvider: () => mockProvider as any,
    } as any);

    const result = await subscribe(options);
    expect(result.periodInDays).toBe(7);
    expect(result.overridePeriodInSecondsForTestnet).toBeUndefined(); // Should not have overridePeriodInSecondsForTestnet when not provided
  });

  it('should include overridePeriodInSecondsForTestnet in result and calculate periodInDays correctly', async () => {
    const options: SubscriptionOptions = {
      recurringCharge: '0.01',
      subscriptionOwner: '0x1234567890123456789012345678901234567890',
      overridePeriodInSecondsForTestnet: 172800, // Exactly 2 days
      testnet: true,
    };

    // Mock the provider response
    const mockProvider = {
      request: vi.fn().mockResolvedValue({
        signature: '0xsignature',
        signedData: {
          message: {
            account: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            spender: '0x1234567890123456789012345678901234567890',
            token: '0xtoken',
            allowance: '10000',
            period: 172800, // 2 days in seconds
            start: 1234567890,
            end: 999999999,
            salt: '0xsalt',
            extraData: '0x',
          },
        },
      }),
      disconnect: vi.fn(),
    };

    const { createEphemeralSDK } = await import('./utils/sdkManager.js');
    vi.mocked(createEphemeralSDK).mockReturnValue({
      getProvider: () => mockProvider as any,
    } as any);

    const result = await subscribe(options);
    expect(result.overridePeriodInSecondsForTestnet).toBe(172800); // Should include the exact overridePeriodInSecondsForTestnet
    expect(result.periodInDays).toBe(2); // Should be exactly 2 days
  });

  it('should not include overridePeriodInSecondsForTestnet when using mainnet', async () => {
    const options: SubscriptionOptions = {
      recurringCharge: '10.00',
      subscriptionOwner: '0x1234567890123456789012345678901234567890',
      periodInDays: 30, // Monthly subscription
      testnet: false, // Mainnet
    };

    // Mock the provider response
    const mockProvider = {
      request: vi.fn().mockResolvedValue({
        signature: '0xsignature',
        signedData: {
          message: {
            account: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            spender: '0x1234567890123456789012345678901234567890',
            token: '0xtoken',
            allowance: '10000000',
            period: 2592000, // 30 days in seconds
            start: 1234567890,
            end: 999999999,
            salt: '0xsalt',
            extraData: '0x',
          },
        },
      }),
      disconnect: vi.fn(),
    };

    const { createEphemeralSDK } = await import('./utils/sdkManager.js');
    vi.mocked(createEphemeralSDK).mockReturnValue({
      getProvider: () => mockProvider as any,
    } as any);

    const result = await subscribe(options);
    expect(result.periodInDays).toBe(30);
    expect(result.overridePeriodInSecondsForTestnet).toBeUndefined(); // Should not have overridePeriodInSecondsForTestnet on mainnet
  });
});

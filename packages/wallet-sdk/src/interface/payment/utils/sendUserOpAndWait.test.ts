import type { EvmSmartAccount } from '@coinbase/cdp-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrepareChargeCall } from '../types.js';
import { sendUserOpAndWait } from './sendUserOpAndWait.js';

describe('sendUserOpAndWait', () => {
  let mockNetworkSmartWallet: Awaited<ReturnType<EvmSmartAccount['useNetwork']>>;
  let mockCalls: PrepareChargeCall[];

  beforeEach(() => {
    vi.clearAllMocks();

    mockNetworkSmartWallet = {
      sendUserOperation: vi.fn(),
      waitForUserOperation: vi.fn(),
    } as any;

    mockCalls = [
      {
        to: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        data: '0xabcd' as `0x${string}`,
        value: BigInt(0),
      },
    ];
  });

  it('should successfully send user operation and return transaction hash', async () => {
    const mockUserOpHash = '0xUserOpHash123';
    const mockTransactionHash = '0xTxHash456';

    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockResolvedValue({
      smartAccountAddress: '0xSmartAccount',
      status: 'broadcast',
      userOpHash: mockUserOpHash,
    });

    vi.mocked(mockNetworkSmartWallet.waitForUserOperation).mockResolvedValue({
      status: 'completed',
      transactionHash: mockTransactionHash,
      userOpHash: mockUserOpHash,
    } as any);

    const result = await sendUserOpAndWait(
      mockNetworkSmartWallet,
      mockCalls,
      undefined,
      60,
      'charge'
    );

    expect(result).toBe(mockTransactionHash);
    expect(mockNetworkSmartWallet.sendUserOperation).toHaveBeenCalledWith({
      calls: mockCalls,
    });
    expect(mockNetworkSmartWallet.waitForUserOperation).toHaveBeenCalledWith({
      userOpHash: mockUserOpHash,
      waitOptions: {
        timeoutSeconds: 60,
      },
    });
  });

  it('should send user operation with paymaster URL when provided', async () => {
    const mockUserOpHash = '0xUserOpHash123';
    const mockTransactionHash = '0xTxHash456';
    const paymasterUrl = 'https://paymaster.example.com';

    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockResolvedValue({
      smartAccountAddress: '0xSmartAccount',
      status: 'broadcast',
      userOpHash: mockUserOpHash,
    });

    vi.mocked(mockNetworkSmartWallet.waitForUserOperation).mockResolvedValue({
      status: 'completed',
      transactionHash: mockTransactionHash,
      userOpHash: mockUserOpHash,
    } as any);

    const result = await sendUserOpAndWait(
      mockNetworkSmartWallet,
      mockCalls,
      paymasterUrl,
      60,
      'charge'
    );

    expect(result).toBe(mockTransactionHash);
    expect(mockNetworkSmartWallet.sendUserOperation).toHaveBeenCalledWith({
      calls: mockCalls,
      paymasterUrl,
    });
  });

  it('should use custom timeout when specified', async () => {
    const mockUserOpHash = '0xUserOpHash123';
    const mockTransactionHash = '0xTxHash456';
    const customTimeout = 120;

    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockResolvedValue({
      smartAccountAddress: '0xSmartAccount',
      status: 'broadcast',
      userOpHash: mockUserOpHash,
    });

    vi.mocked(mockNetworkSmartWallet.waitForUserOperation).mockResolvedValue({
      status: 'completed',
      transactionHash: mockTransactionHash,
      userOpHash: mockUserOpHash,
    } as any);

    await sendUserOpAndWait(mockNetworkSmartWallet, mockCalls, undefined, customTimeout, 'revoke');

    expect(mockNetworkSmartWallet.waitForUserOperation).toHaveBeenCalledWith({
      userOpHash: mockUserOpHash,
      waitOptions: {
        timeoutSeconds: customTimeout,
      },
    });
  });

  it('should throw error when user operation fails', async () => {
    const mockUserOpHash = '0xUserOpHash123';

    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockResolvedValue({
      smartAccountAddress: '0xSmartAccount',
      status: 'broadcast',
      userOpHash: mockUserOpHash,
    });

    vi.mocked(mockNetworkSmartWallet.waitForUserOperation).mockResolvedValue({
      status: 'failed',
      userOpHash: mockUserOpHash,
    } as any);

    await expect(
      sendUserOpAndWait(mockNetworkSmartWallet, mockCalls, undefined, 60, 'charge')
    ).rejects.toThrow(
      'Failed to execute charge transaction with smart wallet: User operation failed: 0xUserOpHash123'
    );
  });

  it('should throw error when transaction hash is missing', async () => {
    const mockUserOpHash = '0xUserOpHash123';

    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockResolvedValue({
      smartAccountAddress: '0xSmartAccount',
      status: 'broadcast',
      userOpHash: mockUserOpHash,
    });

    vi.mocked(mockNetworkSmartWallet.waitForUserOperation).mockResolvedValue({
      status: 'completed',
      userOpHash: mockUserOpHash,
      // transactionHash is missing
    } as any);

    await expect(
      sendUserOpAndWait(mockNetworkSmartWallet, mockCalls, undefined, 60, 'revoke')
    ).rejects.toThrow(
      'Failed to execute revoke transaction with smart wallet: No transaction hash received from operation'
    );
  });

  it('should throw error when transaction hash is null', async () => {
    const mockUserOpHash = '0xUserOpHash123';

    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockResolvedValue({
      smartAccountAddress: '0xSmartAccount',
      status: 'broadcast',
      userOpHash: mockUserOpHash,
    });

    vi.mocked(mockNetworkSmartWallet.waitForUserOperation).mockResolvedValue({
      status: 'completed',
      userOpHash: mockUserOpHash,
      transactionHash: null,
    } as any);

    await expect(
      sendUserOpAndWait(mockNetworkSmartWallet, mockCalls, undefined, 60, 'charge')
    ).rejects.toThrow(
      'Failed to execute charge transaction with smart wallet: No transaction hash received from operation'
    );
  });

  it('should wrap errors from sendUserOperation', async () => {
    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockRejectedValue(
      new Error('Network error')
    );

    await expect(
      sendUserOpAndWait(mockNetworkSmartWallet, mockCalls, undefined, 60, 'charge')
    ).rejects.toThrow('Failed to execute charge transaction with smart wallet: Network error');
  });

  it('should wrap errors from waitForUserOperation', async () => {
    const mockUserOpHash = '0xUserOpHash123';

    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockResolvedValue({
      smartAccountAddress: '0xSmartAccount',
      status: 'broadcast',
      userOpHash: mockUserOpHash,
    });

    vi.mocked(mockNetworkSmartWallet.waitForUserOperation).mockRejectedValue(
      new Error('Timeout waiting for operation')
    );

    await expect(
      sendUserOpAndWait(mockNetworkSmartWallet, mockCalls, undefined, 60, 'revoke')
    ).rejects.toThrow(
      'Failed to execute revoke transaction with smart wallet: Timeout waiting for operation'
    );
  });

  it('should wrap non-Error exceptions', async () => {
    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockRejectedValue('String error');

    await expect(
      sendUserOpAndWait(mockNetworkSmartWallet, mockCalls, undefined, 60, 'charge')
    ).rejects.toThrow('Failed to execute charge transaction with smart wallet: String error');
  });

  it('should handle multiple calls', async () => {
    const multipleCalls: PrepareChargeCall[] = [
      {
        to: '0x1111111111111111111111111111111111111111' as `0x${string}`,
        data: '0xaaaa' as `0x${string}`,
        value: BigInt(0),
      },
      {
        to: '0x2222222222222222222222222222222222222222' as `0x${string}`,
        data: '0xbbbb' as `0x${string}`,
        value: BigInt(100),
      },
    ];

    const mockUserOpHash = '0xUserOpHash123';
    const mockTransactionHash = '0xTxHash456';

    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockResolvedValue({
      smartAccountAddress: '0xSmartAccount',
      status: 'broadcast',
      userOpHash: mockUserOpHash,
    });

    vi.mocked(mockNetworkSmartWallet.waitForUserOperation).mockResolvedValue({
      status: 'completed',
      transactionHash: mockTransactionHash,
      userOpHash: mockUserOpHash,
    } as any);

    const result = await sendUserOpAndWait(
      mockNetworkSmartWallet,
      multipleCalls,
      undefined,
      60,
      'charge'
    );

    expect(result).toBe(mockTransactionHash);
    expect(mockNetworkSmartWallet.sendUserOperation).toHaveBeenCalledWith({
      calls: multipleCalls,
    });
  });

  it('should include context in error messages', async () => {
    vi.mocked(mockNetworkSmartWallet.sendUserOperation).mockRejectedValue(new Error('Test error'));

    await expect(
      sendUserOpAndWait(mockNetworkSmartWallet, mockCalls, undefined, 60, 'payment processing')
    ).rejects.toThrow('Failed to execute payment processing transaction with smart wallet');
  });
});

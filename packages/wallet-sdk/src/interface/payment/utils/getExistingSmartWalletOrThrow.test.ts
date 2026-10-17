import type { CdpClient, EvmSmartAccount } from '@coinbase/cdp-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getExistingSmartWalletOrThrow } from './getExistingSmartWalletOrThrow.js';

describe('getExistingSmartWalletOrThrow', () => {
  let mockCdpClient: CdpClient;
  let mockEoaAccount: any;
  let mockSmartWallet: EvmSmartAccount;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEoaAccount = {
      address: '0x1234567890123456789012345678901234567890',
    };

    mockSmartWallet = {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    } as unknown as EvmSmartAccount;

    mockCdpClient = {
      evm: {
        getAccount: vi.fn(),
        getSmartAccount: vi.fn(),
      },
    } as unknown as CdpClient;
  });

  it('should successfully retrieve existing smart wallet', async () => {
    vi.mocked(mockCdpClient.evm.getAccount).mockResolvedValue(mockEoaAccount);
    vi.mocked(mockCdpClient.evm.getSmartAccount).mockResolvedValue(mockSmartWallet);

    const result = await getExistingSmartWalletOrThrow(mockCdpClient, 'test-wallet', 'charge');

    expect(result).toBe(mockSmartWallet);
    expect(mockCdpClient.evm.getAccount).toHaveBeenCalledWith({ name: 'test-wallet' });
    expect(mockCdpClient.evm.getSmartAccount).toHaveBeenCalledWith({
      name: 'test-wallet',
      owner: mockEoaAccount,
    });
  });

  it('should throw error when EOA wallet is not found (returns null)', async () => {
    vi.mocked(mockCdpClient.evm.getAccount).mockResolvedValue(null as any);

    await expect(
      getExistingSmartWalletOrThrow(mockCdpClient, 'test-wallet', 'charge')
    ).rejects.toThrow(
      'EOA wallet "test-wallet" not found. The wallet must be created before executing a charge. Use getOrCreateSubscriptionOwnerWallet() to create the wallet first.'
    );

    expect(mockCdpClient.evm.getSmartAccount).not.toHaveBeenCalled();
  });

  it('should throw error when EOA wallet is not found (returns undefined)', async () => {
    vi.mocked(mockCdpClient.evm.getAccount).mockResolvedValue(undefined as any);

    await expect(
      getExistingSmartWalletOrThrow(mockCdpClient, 'my-wallet', 'revoke')
    ).rejects.toThrow(
      'EOA wallet "my-wallet" not found. The wallet must be created before executing a revoke. Use getOrCreateSubscriptionOwnerWallet() to create the wallet first.'
    );
  });

  it('should throw error when smart wallet is not found (returns null)', async () => {
    vi.mocked(mockCdpClient.evm.getAccount).mockResolvedValue(mockEoaAccount);
    vi.mocked(mockCdpClient.evm.getSmartAccount).mockResolvedValue(null as any);

    await expect(
      getExistingSmartWalletOrThrow(mockCdpClient, 'test-wallet', 'charge')
    ).rejects.toThrow(
      'Smart wallet "test-wallet" not found. The wallet must be created before executing a charge. Use getOrCreateSubscriptionOwnerWallet() to create the wallet first.'
    );

    expect(mockCdpClient.evm.getAccount).toHaveBeenCalledWith({ name: 'test-wallet' });
    expect(mockCdpClient.evm.getSmartAccount).toHaveBeenCalledWith({
      name: 'test-wallet',
      owner: mockEoaAccount,
    });
  });

  it('should throw error when smart wallet is not found (returns undefined)', async () => {
    vi.mocked(mockCdpClient.evm.getAccount).mockResolvedValue(mockEoaAccount);
    vi.mocked(mockCdpClient.evm.getSmartAccount).mockResolvedValue(undefined as any);

    await expect(
      getExistingSmartWalletOrThrow(mockCdpClient, 'another-wallet', 'revoke')
    ).rejects.toThrow(
      'Smart wallet "another-wallet" not found. The wallet must be created before executing a revoke. Use getOrCreateSubscriptionOwnerWallet() to create the wallet first.'
    );
  });

  it('should re-throw custom "not found" errors', async () => {
    const customError = new Error('Custom wallet "test" not found');
    vi.mocked(mockCdpClient.evm.getAccount).mockRejectedValue(customError);

    await expect(
      getExistingSmartWalletOrThrow(mockCdpClient, 'test-wallet', 'charge')
    ).rejects.toThrow('Custom wallet "test" not found');
  });

  it('should wrap generic errors with context', async () => {
    const genericError = new Error('Network timeout');
    vi.mocked(mockCdpClient.evm.getAccount).mockRejectedValue(genericError);

    await expect(
      getExistingSmartWalletOrThrow(mockCdpClient, 'test-wallet', 'charge')
    ).rejects.toThrow('Failed to get charge smart wallet "test-wallet": Network timeout');
  });

  it('should wrap non-Error exceptions with context', async () => {
    vi.mocked(mockCdpClient.evm.getAccount).mockRejectedValue('String error');

    await expect(
      getExistingSmartWalletOrThrow(mockCdpClient, 'test-wallet', 'revoke')
    ).rejects.toThrow('Failed to get revoke smart wallet "test-wallet": String error');
  });

  it('should wrap object exceptions with context', async () => {
    vi.mocked(mockCdpClient.evm.getAccount).mockRejectedValue({ code: 'ERR_UNKNOWN' });

    await expect(
      getExistingSmartWalletOrThrow(mockCdpClient, 'test-wallet', 'charge')
    ).rejects.toThrow('Failed to get charge smart wallet "test-wallet": [object Object]');
  });

  it('should handle errors during smart wallet retrieval', async () => {
    vi.mocked(mockCdpClient.evm.getAccount).mockResolvedValue(mockEoaAccount);
    vi.mocked(mockCdpClient.evm.getSmartAccount).mockRejectedValue(
      new Error('Smart wallet retrieval failed')
    );

    await expect(
      getExistingSmartWalletOrThrow(mockCdpClient, 'test-wallet', 'charge')
    ).rejects.toThrow(
      'Failed to get charge smart wallet "test-wallet": Smart wallet retrieval failed'
    );
  });

  it('should use the same wallet name for both EOA and smart wallet', async () => {
    vi.mocked(mockCdpClient.evm.getAccount).mockResolvedValue(mockEoaAccount);
    vi.mocked(mockCdpClient.evm.getSmartAccount).mockResolvedValue(mockSmartWallet);

    const walletName = 'my-subscription-wallet';
    await getExistingSmartWalletOrThrow(mockCdpClient, walletName, 'charge');

    expect(mockCdpClient.evm.getAccount).toHaveBeenCalledWith({ name: walletName });
    expect(mockCdpClient.evm.getSmartAccount).toHaveBeenCalledWith({
      name: walletName, // Same name as EOA
      owner: mockEoaAccount,
    });
  });
});

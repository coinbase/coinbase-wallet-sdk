import type { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { describe, expect, it, vi } from 'vitest';
import { prepareCharge } from './prepareCharge.js';
import type { PrepareChargeResult } from './types.js';

// Mock dependencies
vi.mock('../public-utilities/spend-permission/index.js', () => ({
  fetchPermission: vi.fn(),
  prepareSpendCallData: vi.fn(),
}));

vi.mock('viem', () => ({
  parseUnits: vi.fn((value: string) => BigInt(parseFloat(value) * 1_000_000)),
  encodeFunctionData: vi.fn(() => '0xencodedTransferData'),
}));

describe('prepareCharge', () => {
  const mockPermission = {
    chainId: 8453, // Base mainnet
    permission: { token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }, // USDC mainnet
    signature: '0xmocksignature',
  } as SpendPermission;

  const mockCallData: PrepareChargeResult = [
    { to: '0xmock', data: '0xapprove', value: 0n },
    { to: '0xmock', data: '0xspend', value: 0n },
  ];

  it('should prepare charge for specific amount', async () => {
    const { fetchPermission, prepareSpendCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );
    vi.mocked(fetchPermission).mockResolvedValue(mockPermission);
    vi.mocked(prepareSpendCallData).mockResolvedValue(mockCallData);

    const result = await prepareCharge({
      id: '0xhash123',
      amount: '10.50',
      testnet: false,
    });

    expect(fetchPermission).toHaveBeenCalledWith({ permissionHash: '0xhash123' });
    expect(prepareSpendCallData).toHaveBeenCalledWith(mockPermission, 10500000n, undefined, {
      rpcUrl: undefined,
    });
    expect(result).toEqual(mockCallData);
  });

  it('should prepare charge for max remaining amount', async () => {
    const { fetchPermission, prepareSpendCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );
    vi.mocked(fetchPermission).mockResolvedValue(mockPermission);
    vi.mocked(prepareSpendCallData).mockResolvedValue(mockCallData);

    const result = await prepareCharge({
      id: '0xhash123',
      amount: 'max-remaining-charge',
      testnet: false,
    });

    expect(prepareSpendCallData).toHaveBeenCalledWith(
      mockPermission,
      'max-remaining-allowance',
      undefined,
      { rpcUrl: undefined }
    );
    expect(result).toEqual(mockCallData);
  });

  it('should handle testnet permissions', async () => {
    const testnetPermission = {
      chainId: 84532, // Base Sepolia
      permission: { token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' }, // USDC testnet
      signature: '0xmocksignature',
    } as SpendPermission;
    const { fetchPermission, prepareSpendCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );
    vi.mocked(fetchPermission).mockResolvedValue(testnetPermission);
    vi.mocked(prepareSpendCallData).mockResolvedValue(mockCallData);

    await prepareCharge({
      id: '0xhash123',
      amount: '5.00',
      testnet: true,
    });

    expect(prepareSpendCallData).toHaveBeenCalledWith(testnetPermission, 5000000n, undefined, {
      rpcUrl: undefined,
    });
  });

  it('should throw error for network mismatch', async () => {
    const { fetchPermission } = await import('../public-utilities/spend-permission/index.js');
    vi.mocked(fetchPermission).mockResolvedValue(mockPermission);

    await expect(prepareCharge({ id: '0xhash123', amount: '10', testnet: true })).rejects.toThrow(
      'The subscription was requested on testnet but is actually a mainnet subscription'
    );
  });

  it('should throw error for non-USDC token', async () => {
    const wrongTokenPermission = {
      chainId: 8453,
      permission: { token: '0xwrongtoken' },
      signature: '0xmocksignature',
    } as SpendPermission;
    const { fetchPermission } = await import('../public-utilities/spend-permission/index.js');
    vi.mocked(fetchPermission).mockResolvedValue(wrongTokenPermission);

    await expect(prepareCharge({ id: '0xhash123', amount: '10', testnet: false })).rejects.toThrow(
      /Subscription is not for USDC token/
    );
  });

  it('should pass recipient to prepareSpendCallData when provided', async () => {
    const { fetchPermission, prepareSpendCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );

    vi.mocked(fetchPermission).mockResolvedValue(mockPermission);
    vi.mocked(prepareSpendCallData).mockResolvedValue(mockCallData);

    const recipient = '0x0000000000000000000000000000000000000001';
    const result = await prepareCharge({
      id: '0xhash123',
      amount: '10.50',
      testnet: false,
      recipient: recipient as any,
    });

    expect(fetchPermission).toHaveBeenCalledWith({ permissionHash: '0xhash123' });
    // Now prepareSpendCallData handles the recipient and transfer logic
    expect(prepareSpendCallData).toHaveBeenCalledWith(mockPermission, 10500000n, recipient, {
      rpcUrl: undefined,
    });
    expect(result).toEqual(mockCallData);
  });

  it('should pass recipient to prepareSpendCallData for testnet', async () => {
    const testnetPermission = {
      chainId: 84532, // Base Sepolia
      permission: { token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' }, // USDC testnet
      signature: '0xmocksignature',
    } as SpendPermission;

    const { fetchPermission, prepareSpendCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );

    vi.mocked(fetchPermission).mockResolvedValue(testnetPermission);
    vi.mocked(prepareSpendCallData).mockResolvedValue(mockCallData);

    const recipient = '0x0000000000000000000000000000000000000001';
    const result = await prepareCharge({
      id: '0xhash123',
      amount: '5.00',
      testnet: true,
      recipient: recipient as any,
    });

    // Now prepareSpendCallData handles the recipient and transfer logic
    expect(prepareSpendCallData).toHaveBeenCalledWith(testnetPermission, 5000000n, recipient, {
      rpcUrl: undefined,
    });
    expect(result).toEqual(mockCallData);
  });

  it('should handle recipient with max-remaining-charge', async () => {
    const { fetchPermission, prepareSpendCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );

    vi.mocked(fetchPermission).mockResolvedValue(mockPermission);
    vi.mocked(prepareSpendCallData).mockResolvedValue(mockCallData);

    const recipient = '0x0000000000000000000000000000000000000001';
    const result = await prepareCharge({
      id: '0xhash123',
      amount: 'max-remaining-charge',
      testnet: false,
      recipient: recipient as any,
    });

    // Now prepareSpendCallData handles the recipient and transfer logic with max amount
    expect(prepareSpendCallData).toHaveBeenCalledWith(
      mockPermission,
      'max-remaining-allowance',
      recipient,
      { rpcUrl: undefined }
    );
    expect(result).toEqual(mockCallData);
  });

  it('should pass rpcUrl to prepareSpendCallData when provided', async () => {
    const { fetchPermission, prepareSpendCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );
    vi.mocked(fetchPermission).mockResolvedValue(mockPermission);
    vi.mocked(prepareSpendCallData).mockResolvedValue(mockCallData);

    const customRpcUrl = 'https://my-custom-rpc.example.com';
    const result = await prepareCharge({
      id: '0xhash123',
      amount: '10.50',
      testnet: false,
      rpcUrl: customRpcUrl,
    });

    expect(fetchPermission).toHaveBeenCalledWith({ permissionHash: '0xhash123' });
    expect(prepareSpendCallData).toHaveBeenCalledWith(mockPermission, 10500000n, undefined, {
      rpcUrl: customRpcUrl,
    });
    expect(result).toEqual(mockCallData);
  });

  it('should accept matching expectedSpender and expectedPayer', async () => {
    const authorizedPermission = {
      chainId: 8453,
      permission: {
        account: '0x1111111111111111111111111111111111111111',
        spender: '0x2222222222222222222222222222222222222222',
        token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      signature: '0xmocksignature',
    } as SpendPermission;
    const { fetchPermission, prepareSpendCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );
    vi.mocked(fetchPermission).mockResolvedValue(authorizedPermission);
    vi.mocked(prepareSpendCallData).mockResolvedValue(mockCallData);

    const result = await prepareCharge({
      id: '0xhash123',
      amount: '10.50',
      testnet: false,
      expectedSpender: '0x2222222222222222222222222222222222222222' as any,
      expectedPayer: '0x1111111111111111111111111111111111111111' as any,
    });

    expect(result).toEqual(mockCallData);
  });

  it('should reject mismatched expectedSpender', async () => {
    const authorizedPermission = {
      chainId: 8453,
      permission: {
        account: '0x1111111111111111111111111111111111111111',
        spender: '0x2222222222222222222222222222222222222222',
        token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      signature: '0xmocksignature',
    } as SpendPermission;
    const { fetchPermission, prepareSpendCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );
    vi.mocked(fetchPermission).mockResolvedValue(authorizedPermission);
    vi.mocked(prepareSpendCallData).mockClear();

    await expect(
      prepareCharge({
        id: '0xhash123',
        amount: '10.50',
        testnet: false,
        expectedSpender: '0x3333333333333333333333333333333333333333' as any,
      })
    ).rejects.toThrow(/Subscription spender/);
    expect(prepareSpendCallData).not.toHaveBeenCalled();
  });

  it('should reject mismatched expectedPayer', async () => {
    const authorizedPermission = {
      chainId: 8453,
      permission: {
        account: '0x1111111111111111111111111111111111111111',
        spender: '0x2222222222222222222222222222222222222222',
        token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      signature: '0xmocksignature',
    } as SpendPermission;
    const { fetchPermission, prepareSpendCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );
    vi.mocked(fetchPermission).mockResolvedValue(authorizedPermission);
    vi.mocked(prepareSpendCallData).mockClear();

    await expect(
      prepareCharge({
        id: '0xhash123',
        amount: '10.50',
        testnet: false,
        expectedPayer: '0x3333333333333333333333333333333333333333' as any,
      })
    ).rejects.toThrow(/Subscription payer/);
    expect(prepareSpendCallData).not.toHaveBeenCalled();
  });
});

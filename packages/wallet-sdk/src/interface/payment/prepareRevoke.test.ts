import type { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { describe, expect, it, vi } from 'vitest';
import { prepareRevoke } from './prepareRevoke.js';

vi.mock('../public-utilities/spend-permission/index.js', () => ({
  fetchPermission: vi.fn(),
  prepareRevokeCallData: vi.fn(),
}));

describe('prepareRevoke', () => {
  const mockRevokeCall = {
    to: '0xmock' as const,
    data: '0xrevoke' as const,
    value: 0n,
  };

  it('prepares revoke call data for a valid subscription', async () => {
    const permission = {
      chainId: 8453,
      permission: {
        account: '0x1111111111111111111111111111111111111111',
        spender: '0x2222222222222222222222222222222222222222',
        token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      signature: '0xmocksignature',
    } as SpendPermission;
    const { fetchPermission, prepareRevokeCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );
    vi.mocked(fetchPermission).mockResolvedValue(permission);
    vi.mocked(prepareRevokeCallData).mockResolvedValue(mockRevokeCall as any);

    const result = await prepareRevoke({
      id: '0xhash123',
      testnet: false,
      expectedSpender: '0x2222222222222222222222222222222222222222' as any,
      expectedPayer: '0x1111111111111111111111111111111111111111' as any,
    });

    expect(fetchPermission).toHaveBeenCalledWith({ permissionHash: '0xhash123' });
    expect(prepareRevokeCallData).toHaveBeenCalledWith(permission);
    expect(result).toEqual(mockRevokeCall);
  });

  it('rejects mismatched expectedSpender', async () => {
    const permission = {
      chainId: 8453,
      permission: {
        account: '0x1111111111111111111111111111111111111111',
        spender: '0x2222222222222222222222222222222222222222',
        token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      signature: '0xmocksignature',
    } as SpendPermission;
    const { fetchPermission, prepareRevokeCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );
    vi.mocked(fetchPermission).mockResolvedValue(permission);
    vi.mocked(prepareRevokeCallData).mockClear();

    await expect(
      prepareRevoke({
        id: '0xhash123',
        testnet: false,
        expectedSpender: '0x3333333333333333333333333333333333333333' as any,
      })
    ).rejects.toThrow(/Subscription spender/);
    expect(prepareRevokeCallData).not.toHaveBeenCalled();
  });

  it('rejects mismatched expectedPayer', async () => {
    const permission = {
      chainId: 8453,
      permission: {
        account: '0x1111111111111111111111111111111111111111',
        spender: '0x2222222222222222222222222222222222222222',
        token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      signature: '0xmocksignature',
    } as SpendPermission;
    const { fetchPermission, prepareRevokeCallData } = await import(
      '../public-utilities/spend-permission/index.js'
    );
    vi.mocked(fetchPermission).mockResolvedValue(permission);
    vi.mocked(prepareRevokeCallData).mockClear();

    await expect(
      prepareRevoke({
        id: '0xhash123',
        testnet: false,
        expectedPayer: '0x3333333333333333333333333333333333333333' as any,
      })
    ).rejects.toThrow(/Subscription payer/);
    expect(prepareRevokeCallData).not.toHaveBeenCalled();
  });
});

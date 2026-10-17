import type { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { describe, expect, it } from 'vitest';
import { assertPermissionAuthorization } from './assertPermissionAuthorization.js';

describe('assertPermissionAuthorization', () => {
  const permission = {
    chainId: 8453,
    permission: {
      account: '0x1111111111111111111111111111111111111111',
      spender: '0x2222222222222222222222222222222222222222',
      token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      allowance: '1000000',
      period: 86400,
      start: 0,
      end: 0,
      salt: '0x0',
      extraData: '0x',
    },
    signature: '0xmocksignature',
  } as SpendPermission;

  it('does nothing when no checks are provided', () => {
    expect(() => assertPermissionAuthorization(permission, {})).not.toThrow();
  });

  it('accepts a matching spender (case-insensitive)', () => {
    expect(() =>
      assertPermissionAuthorization(permission, {
        expectedSpender: '0x2222222222222222222222222222222222222222',
      })
    ).not.toThrow();

    expect(() =>
      assertPermissionAuthorization(permission, {
        expectedSpender: '0x2222222222222222222222222222222222222222'.toUpperCase(),
      })
    ).not.toThrow();
  });

  it('rejects a mismatched spender', () => {
    expect(() =>
      assertPermissionAuthorization(permission, {
        expectedSpender: '0x3333333333333333333333333333333333333333',
      })
    ).toThrow(
      'Subscription spender 0x2222222222222222222222222222222222222222 does not match expected spender 0x3333333333333333333333333333333333333333'
    );
  });

  it('accepts a matching payer (case-insensitive)', () => {
    expect(() =>
      assertPermissionAuthorization(permission, {
        expectedPayer: '0x1111111111111111111111111111111111111111',
      })
    ).not.toThrow();
  });

  it('rejects a mismatched payer', () => {
    expect(() =>
      assertPermissionAuthorization(permission, {
        expectedPayer: '0x3333333333333333333333333333333333333333',
      })
    ).toThrow(
      'Subscription payer 0x1111111111111111111111111111111111111111 does not match expected payer 0x3333333333333333333333333333333333333333'
    );
  });

  it('checks both spender and payer when both are provided', () => {
    expect(() =>
      assertPermissionAuthorization(permission, {
        expectedSpender: '0x2222222222222222222222222222222222222222',
        expectedPayer: '0x1111111111111111111111111111111111111111',
      })
    ).not.toThrow();

    expect(() =>
      assertPermissionAuthorization(permission, {
        expectedSpender: '0x2222222222222222222222222222222222222222',
        expectedPayer: '0x3333333333333333333333333333333333333333',
      })
    ).toThrow(/Subscription payer/);
  });
});

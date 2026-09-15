import type { Store } from ':store/store.js';
import { shouldUseSubAccount } from './dispatch.js';

const GLOBAL = '0x0000000000000000000000000000000000000001';
const SUB = '0x0000000000000000000000000000000000000002';

function state(sub?: string): Store['eip155'] {
  return {
    subAccounts: {
      get: () => (sub ? { address: sub as `0x${string}` } : undefined),
    },
  } as unknown as Store['eip155'];
}

describe('shouldUseSubAccount', () => {
  it('is false when the request has no sender', () => {
    expect(shouldUseSubAccount(state(SUB), { method: 'personal_sign' })).toBe(false);
  });

  it('is false when no sub-account is cached', () => {
    expect(
      shouldUseSubAccount(state(), {
        method: 'eth_sendTransaction',
        params: [{ from: SUB }],
      })
    ).toBe(false);
  });

  it('is true when from is the cached sub-account', () => {
    expect(
      shouldUseSubAccount(state(SUB), {
        method: 'wallet_sendCalls',
        params: [{ from: SUB }],
      })
    ).toBe(true);
  });

  it('is false when from is the global account', () => {
    expect(
      shouldUseSubAccount(state(SUB), {
        method: 'eth_sendTransaction',
        params: [{ from: GLOBAL }],
      })
    ).toBe(false);
  });
});

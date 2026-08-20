import type { PopupRuntime } from ':core/channel/types.js';
import { shouldUseSubAccount } from './dispatch.js';

const GLOBAL = '0x0000000000000000000000000000000000000001';
const SUB = '0x0000000000000000000000000000000000000002';

function runtime(sub?: string): PopupRuntime {
  return {
    helpers: {
      subAccounts: {
        get: () => (sub ? { address: sub as `0x${string}` } : undefined),
      },
    } as unknown as PopupRuntime['helpers'],
    chainId: () => 1,
    handshake: vi.fn(),
    send: vi.fn(),
    channel: { kind: 'popup', send: vi.fn() },
    readSession: () => undefined,
    writeSession: vi.fn(),
    cleanup: vi.fn(),
  };
}

describe('shouldUseSubAccount', () => {
  it('is false when the request has no sender', () => {
    expect(shouldUseSubAccount(runtime(SUB), { method: 'personal_sign' })).toBe(false);
  });

  it('is false when no sub-account is cached', () => {
    expect(
      shouldUseSubAccount(runtime(), {
        method: 'eth_sendTransaction',
        params: [{ from: SUB }],
      })
    ).toBe(false);
  });

  it('is true when from is the cached sub-account', () => {
    expect(
      shouldUseSubAccount(runtime(SUB), {
        method: 'wallet_sendCalls',
        params: [{ from: SUB }],
      })
    ).toBe(true);
  });

  it('is false when from is the global account', () => {
    expect(
      shouldUseSubAccount(runtime(SUB), {
        method: 'eth_sendTransaction',
        params: [{ from: GLOBAL }],
      })
    ).toBe(false);
  });
});

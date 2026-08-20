import type { PopupRuntime } from ':core/channel/types.js';
import { sessionFromAccounts } from ':core/session/index.js';
import { orderedEthAccounts, persistSubAccount } from './accounts.js';

const GLOBAL = '0x0000000000000000000000000000000000000001' as const;
const SUB = '0x0000000000000000000000000000000000000002' as const;

function runtime(opts?: { defaultAccount?: 'sub' | 'universal' }): PopupRuntime {
  const sessionStore: { current?: Parameters<PopupRuntime['writeSession']>[0] } = {};
  let accounts: `0x${string}`[] = [GLOBAL];
  let subAccount: { address: `0x${string}` } | undefined;
  const emit = vi.fn();
  return {
    helpers: {
      account: {
        get: () => ({ accounts }),
        set: vi.fn((value: { accounts?: `0x${string}`[] }) => {
          if (value.accounts) accounts = value.accounts;
        }),
        clear: vi.fn(),
      },
      subAccounts: {
        get: () => subAccount,
        set: vi.fn((value: { address: `0x${string}` }) => {
          subAccount = { ...subAccount, ...value };
        }),
        clear: vi.fn(),
      },
      subAccountsConfig: {
        get: () => ({ defaultAccount: opts?.defaultAccount }),
        set: vi.fn(),
        clear: vi.fn(),
      },
    } as unknown as PopupRuntime['helpers'],
    emit,
    chainId: () => 1,
    handshake: vi.fn(),
    send: vi.fn(),
    channel: { kind: 'popup', send: vi.fn() },
    readSession: () => sessionStore.current,
    writeSession: (session) => {
      sessionStore.current = session;
    },
    cleanup: vi.fn(),
  };
}

describe('orderedEthAccounts', () => {
  it('returns accounts unchanged when no sub-account is cached', () => {
    const rt = runtime();
    expect(orderedEthAccounts(rt, [GLOBAL])).toEqual([GLOBAL]);
  });

  it('appends the sub-account by default', () => {
    const rt = runtime();
    rt.helpers.subAccounts.set({ address: SUB });
    expect(orderedEthAccounts(rt, [GLOBAL])).toEqual([GLOBAL, SUB]);
  });

  it('prepends the sub-account when defaultAccount is sub', () => {
    const rt = runtime({ defaultAccount: 'sub' });
    rt.helpers.subAccounts.set({ address: SUB });
    expect(orderedEthAccounts(rt, [GLOBAL])).toEqual([SUB, GLOBAL]);
  });
});

describe('persistSubAccount', () => {
  it('writes both addresses onto the session and emits accountsChanged', () => {
    const rt = runtime();
    const session = sessionFromAccounts({ accounts: [GLOBAL], chainId: 1 });
    const accounts = persistSubAccount(rt, session, { address: SUB });

    expect(accounts).toEqual([GLOBAL, SUB]);
    expect(rt.helpers.account.get().accounts).toEqual([GLOBAL, SUB]);
    expect(rt.emit).toHaveBeenCalledWith('accountsChanged', [GLOBAL, SUB]);
    expect(rt.readSession()?.scopes['eip155:1']?.accounts).toEqual([
      'eip155:1:0x0000000000000000000000000000000000000001',
      'eip155:1:0x0000000000000000000000000000000000000002',
    ]);
  });
});

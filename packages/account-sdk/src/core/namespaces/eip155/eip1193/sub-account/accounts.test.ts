import type { Eip1193Context } from '../context.js';
import { sessionFromAccounts } from '../../session.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { orderedEthAccounts, persistSubAccount } from './accounts.js';
import { createActiveChain } from '../activeChain.js';

const GLOBAL = '0x0000000000000000000000000000000000000001' as const;
const SUB = '0x0000000000000000000000000000000000000002' as const;

function setup(opts?: {
  defaultAccount?: 'sub' | 'universal';
}): { transport: WalletTransport; cache: Store['eip155']; context: Eip1193Context } {
  const sessionStore: { current?: Parameters<WalletTransport['writeSession']>[0] } = {};
  let subAccount: { address: `0x${string}` } | undefined;
  const emit = vi.fn();
  const cache = {
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
    spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    paymasterUrls: { get: () => undefined, set: vi.fn() },
  } as unknown as Store['eip155'];
  const transport: WalletTransport = {
    handshake: vi.fn(),
    request: vi.fn(),
    readSession: () => sessionStore.current,
    writeSession: (session) => {
      sessionStore.current = session;
    },
    cleanup: vi.fn(),
  };
  return {
    transport,
    cache,
    context: {
      transport,
      cache,
      config: { get: () => ({ version: 'test' }), set: vi.fn() },
      emit,
      chain: createActiveChain({
        defaultChainId: 1,
        onChange: vi.fn(),
      }),
    },
  };
}

describe('orderedEthAccounts', () => {
  it('returns accounts unchanged when no sub-account is cached', () => {
    const { cache } = setup();
    expect(orderedEthAccounts(cache, [GLOBAL])).toEqual([GLOBAL]);
  });

  it('appends the sub-account by default', () => {
    const { cache } = setup();
    cache.subAccounts.set({ address: SUB });
    expect(orderedEthAccounts(cache, [GLOBAL])).toEqual([GLOBAL, SUB]);
  });

  it('prepends the sub-account when defaultAccount is sub', () => {
    const { cache } = setup({ defaultAccount: 'sub' });
    cache.subAccounts.set({ address: SUB });
    expect(orderedEthAccounts(cache, [GLOBAL])).toEqual([SUB, GLOBAL]);
  });
});

describe('persistSubAccount', () => {
  it('writes both addresses onto the session and emits accountsChanged', () => {
    const { transport, context } = setup();
    const session = sessionFromAccounts({ accounts: [GLOBAL], chainId: 1 });
    const accounts = persistSubAccount(context, session, { address: SUB });

    expect(accounts).toEqual([GLOBAL, SUB]);
    expect(context.emit).toHaveBeenCalledWith('accountsChanged', [GLOBAL, SUB]);
    expect(context.emit).toHaveBeenCalledWith('connect', { chainId: '0x1' });
    expect(transport.readSession()?.scopes['eip155:1']?.accounts).toEqual([
      'eip155:1:0x0000000000000000000000000000000000000001',
      'eip155:1:0x0000000000000000000000000000000000000002',
    ]);
  });

  it('uses a custom chain id for the session scope and connect event', () => {
    const { transport, context } = setup();
    const session = sessionFromAccounts({ accounts: [GLOBAL], chainId: 8453 });
    const accounts = persistSubAccount(context, session, { address: SUB }, 8453);

    expect(accounts).toEqual([GLOBAL, SUB]);
    expect(context.emit).toHaveBeenCalledWith('accountsChanged', [GLOBAL, SUB]);
    expect(context.emit).toHaveBeenCalledWith('connect', { chainId: '0x2105' });
    expect(transport.readSession()?.scopes['eip155:8453']?.accounts).toEqual([
      'eip155:8453:0x0000000000000000000000000000000000000001',
      'eip155:8453:0x0000000000000000000000000000000000000002',
    ]);
    expect(transport.readSession()?.scopes['eip155:1']).toBeUndefined();
  });
});

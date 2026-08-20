import { sessionFromAccounts } from ':core/session/index.js';
import { toLegacyRequest } from ':core/translators/eip155/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { getCryptoKeyAccount } from ':owner-key/index.js';
import { addSubAccount } from './add.js';

vi.mock(':owner-key/index.js', () => ({
  getCryptoKeyAccount: vi.fn().mockResolvedValue({
    account: {
      type: 'local',
      address: '0x00000000000000000000000000000000000000aa',
    },
  }),
}));

const GLOBAL = '0x0000000000000000000000000000000000000001' as const;
const SUB = '0x0000000000000000000000000000000000000002' as const;
const OTHER = '0x0000000000000000000000000000000000000003' as const;

function runtime(send: WalletRuntime['send']): WalletRuntime {
  const sessionStore: { current?: Parameters<WalletRuntime['writeSession']>[0] } = {};
  let accounts: `0x${string}`[] = [GLOBAL];
  let subAccount: { address: `0x${string}` } | undefined;
  return {
    store: {
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
        get: () => ({}),
        set: vi.fn(),
        clear: vi.fn(),
      },
    } as unknown as WalletRuntime['store'],
    chainId: () => 1,
    handshake: vi.fn(),
    send,
    transport: { kind: 'popup', send: (envelope) => send(toLegacyRequest(envelope)) },
    readSession: () => sessionStore.current,
    writeSession: (session) => {
      sessionStore.current = session;
    },
    cleanup: vi.fn(),
  };
}

describe('addSubAccount', () => {
  const session = sessionFromAccounts({ accounts: [GLOBAL], chainId: 1 });

  it('returns the cache when no address is requested', async () => {
    const send = vi.fn();
    const rt = runtime(send);
    rt.store.subAccounts.set({ address: SUB });

    const result = await addSubAccount(rt, session, {
      method: 'wallet_addSubAccount',
      params: [{ version: '1', account: { type: 'create', keys: [] } }],
    });

    expect(result).toMatchObject({ address: SUB });
    expect(send).not.toHaveBeenCalled();
  });

  it('skips the cache when a different address is requested', async () => {
    const send = vi.fn().mockResolvedValue({ address: OTHER });
    const rt = runtime(send);
    rt.store.subAccounts.set({ address: SUB });

    const result = await addSubAccount(rt, session, {
      method: 'wallet_addSubAccount',
      params: [{ version: '1', account: { type: 'deployed', address: OTHER } }],
    });

    expect(result).toMatchObject({ address: OTHER });
    expect(send).toHaveBeenCalled();
  });

  it('fills create keys from the crypto-key owner when omitted', async () => {
    const send = vi.fn().mockResolvedValue({ address: SUB });
    const rt = runtime(send);

    await addSubAccount(rt, session, {
      method: 'wallet_addSubAccount',
      params: [{ version: '1', account: { type: 'create' } }],
    });

    expect(getCryptoKeyAccount).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_addSubAccount',
        params: [
          {
            version: '1',
            account: {
              type: 'create',
              keys: [
                {
                  type: 'address',
                  publicKey: '0x00000000000000000000000000000000000000aa',
                },
              ],
            },
          },
        ],
      })
    );
  });
});

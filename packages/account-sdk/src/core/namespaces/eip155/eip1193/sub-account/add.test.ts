import type { Eip1193Context } from '../context.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { sessionFromAccounts } from '../../session.js';
import type { WalletTransport } from ':core/transport/index.js';
import { getCryptoKeyAccount } from ':owner-key/index.js';
import type { Store } from ':store/store.js';
import { createActiveChain } from '../activeChain.js';
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

function setup(send: WalletTransport['request']): {
  transport: WalletTransport;
  context: Eip1193Context;
} {
  const sessionStore: { current?: Parameters<WalletTransport['writeSession']>[0] } = {};
  let subAccount: { address: `0x${string}` } | undefined;
  const cache = {
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
    spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    paymasterUrls: { get: () => undefined, set: vi.fn() },
  } as unknown as Store['eip155'];
  const transport: WalletTransport = {
    handshake: vi.fn(),
    request: async (request) => {
      const result = await send(request);
      const params = request.params as {
        chainId: `eip155:${string}`;
        request: RequestArguments;
      };
      return {
        chainId: params.chainId,
        result: { method: params.request.method, result },
      };
    },
    readSession: () => sessionStore.current,
    writeSession: (session) => {
      sessionStore.current = session;
    },
    cleanup: vi.fn(),
  };
  return {
    transport,
    context: {
      transport,
      cache,
      config: { get: () => ({ version: 'test' }), set: vi.fn() },
      emit: vi.fn(),
      chain: createActiveChain({
        defaultChainId: 1,
        onChange: vi.fn(),
      }),
    },
  };
}

describe('addSubAccount', () => {
  const session = sessionFromAccounts({ accounts: [GLOBAL], chainId: 1 });

  it('returns the cache when no address is requested', async () => {
    const send = vi.fn();
    const { context } = setup(send);
    context.cache.subAccounts.set({ address: SUB });

    const result = await addSubAccount(context, session, {
      method: 'wallet_addSubAccount',
      params: [{ version: '1', account: { type: 'create', keys: [] } }],
    });

    expect(result).toMatchObject({ address: SUB });
    expect(send).not.toHaveBeenCalled();
  });

  it('skips the cache when a different address is requested', async () => {
    const send = vi.fn().mockResolvedValue({ address: OTHER });
    const { context } = setup(send);
    context.cache.subAccounts.set({ address: SUB });

    const result = await addSubAccount(context, session, {
      method: 'wallet_addSubAccount',
      params: [{ version: '1', account: { type: 'deployed', address: OTHER } }],
    });

    expect(result).toMatchObject({ address: OTHER });
    expect(send).toHaveBeenCalled();
  });

  it('fills create keys from the crypto-key owner when omitted', async () => {
    const send = vi.fn().mockResolvedValue({ address: SUB });
    const { context } = setup(send);

    await addSubAccount(context, session, {
      method: 'wallet_addSubAccount',
      params: [{ version: '1', account: { type: 'create' } }],
    });

    expect(getCryptoKeyAccount).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_invokeMethod',
        params: expect.objectContaining({
          request: {
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
          },
        }),
      })
    );
  });
});

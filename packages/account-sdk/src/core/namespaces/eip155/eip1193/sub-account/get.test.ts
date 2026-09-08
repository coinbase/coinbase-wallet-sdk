import type { WalletRuntime } from ':core/transport/index.js';
import * as providerUtil from ':util/provider.js';
import { getSubAccounts } from './get.js';

const SUB = '0x0000000000000000000000000000000000000002' as const;
const FACTORY = '0x00000000000000000000000000000000000000f1' as const;

function runtime(): WalletRuntime {
  let subAccount: { address: `0x${string}`; factory?: `0x${string}` } | undefined;
  return {
    store: {
      account: {
        get: () => ({ chain: { id: 1, rpcUrl: 'https://example.rpc' } }),
        set: vi.fn(),
        clear: vi.fn(),
      },
      subAccounts: {
        get: () => subAccount,
        set: vi.fn((value: { address: `0x${string}` }) => {
          subAccount = { ...subAccount, ...value };
        }),
        clear: vi.fn(),
      },
    } as unknown as WalletRuntime['store'],
    chainId: () => 1,
    handshake: vi.fn(),
    send: vi.fn(),
    transport: { kind: 'popup', send: vi.fn() },
    readSession: () => undefined,
    writeSession: vi.fn(),
    cleanup: vi.fn(),
  };
}

describe('getSubAccounts', () => {
  it('returns the cached sub-account without hitting RPC', async () => {
    const rt = runtime();
    rt.store.subAccounts.set({ address: SUB });
    const fetchSpy = vi.spyOn(providerUtil, 'fetchRPCRequest');

    const result = await getSubAccounts(rt, { method: 'wallet_getSubAccounts' });

    expect(result).toEqual({ subAccounts: [expect.objectContaining({ address: SUB })] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches from the chain RPC and caches the first sub-account', async () => {
    const rt = runtime();
    vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({
      subAccounts: [{ address: SUB, factory: FACTORY, factoryData: '0xab' }],
    });

    const result = await getSubAccounts(rt, { method: 'wallet_getSubAccounts' });

    expect(result).toEqual({
      subAccounts: [{ address: SUB, factory: FACTORY, factoryData: '0xab' }],
    });
    expect(rt.store.subAccounts.get()?.address).toBe(SUB);
  });

  it('throws when no RPC URL is set and nothing is cached', async () => {
    const rt = runtime();
    rt.store.account.get = () => ({ chain: { id: 1 } });

    await expect(getSubAccounts(rt, { method: 'wallet_getSubAccounts' })).rejects.toMatchObject({
      message: 'No RPC URL set for chain',
    });
  });
});

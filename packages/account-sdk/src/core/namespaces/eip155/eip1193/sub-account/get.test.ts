import type { Store } from ':store/store.js';
import * as providerUtil from ':util/provider.js';
import { sessionFromAccounts } from '../../session.js';
import { getSubAccounts } from './get.js';

const SUB = '0x0000000000000000000000000000000000000002' as const;
const FACTORY = '0x00000000000000000000000000000000000000f1' as const;

function state(): Store['eip155'] {
  let subAccount: { address: `0x${string}`; factory?: `0x${string}` } | undefined;
  return {
    subAccounts: {
      get: () => subAccount,
      set: vi.fn((value: { address: `0x${string}` }) => {
        subAccount = { ...subAccount, ...value };
      }),
      clear: vi.fn(),
    },
    subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
    spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    paymasterUrls: { get: () => undefined, set: vi.fn() },
  } as unknown as Store['eip155'];
}

describe('getSubAccounts', () => {
  const session = {
    ...sessionFromAccounts({
      accounts: ['0x0000000000000000000000000000000000000001'],
      chainId: 1,
    }),
    properties: {
      chainMetadata: {
        'eip155:1': { rpcUrl: 'https://example.rpc' },
      },
    },
  };

  it('returns the cached sub-account without hitting RPC', async () => {
    const store = state();
    store.subAccounts.set({ address: SUB });
    const fetchSpy = vi.spyOn(providerUtil, 'fetchRPCRequest');

    const result = await getSubAccounts(store, { method: 'wallet_getSubAccounts' }, session, 1);

    expect(result).toEqual({ subAccounts: [expect.objectContaining({ address: SUB })] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches from the chain RPC and caches the first sub-account', async () => {
    const store = state();
    vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({
      subAccounts: [{ address: SUB, factory: FACTORY, factoryData: '0xab' }],
    });

    const result = await getSubAccounts(store, { method: 'wallet_getSubAccounts' }, session, 1);

    expect(result).toEqual({
      subAccounts: [{ address: SUB, factory: FACTORY, factoryData: '0xab' }],
    });
    expect(store.subAccounts.get()?.address).toBe(SUB);
  });

  it('throws when no RPC URL is set and nothing is cached', async () => {
    const store = state();

    await expect(
      getSubAccounts(
        store,
        { method: 'wallet_getSubAccounts' },
        sessionFromAccounts({
          accounts: ['0x0000000000000000000000000000000000000001'],
          chainId: 1,
        }),
        1
      )
    ).rejects.toMatchObject({ message: 'No RPC URL set for chain' });
  });
});

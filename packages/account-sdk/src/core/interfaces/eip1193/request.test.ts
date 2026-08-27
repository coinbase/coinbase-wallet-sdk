import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { sessionFromAccounts } from ':core/session/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import * as providerUtil from ':util/provider.js';
import { handleEip1193Request } from './request.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

function runtime(opts?: { session?: ReturnType<typeof sessionFromAccounts> }): WalletRuntime {
  const send = vi.fn().mockResolvedValue({
    accounts: [{ address: ADDRESS, capabilities: {} }],
  });
  return {
    store: {
      account: {
        get: () => ({ accounts: opts?.session ? [ADDRESS] : [], chain: { id: 1 } }),
        set: vi.fn(),
        clear: vi.fn(),
      },
      chains: { get: () => [], set: vi.fn(), clear: vi.fn() },
      subAccounts: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
      subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
      spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    } as unknown as WalletRuntime['store'],
    chainId: () => 1,
    handshake: vi.fn().mockResolvedValue(undefined),
    send,
    transport: { kind: 'popup', send: vi.fn() },
    readSession: () => opts?.session,
    writeSession: vi.fn(),
    cleanup: vi.fn(),
  };
}

describe('handleEip1193Request', () => {
  it('forwards disconnected wallet_getCallsStatus to Coinbase HTTP', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({ status: 200 });
    const args = { method: 'wallet_getCallsStatus', params: ['0x1'] };
    await expect(handleEip1193Request(runtime(), args)).resolves.toEqual({ status: 200 });
    expect(fetchRPC).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
    fetchRPC.mockRestore();
  });

  it('routes to disconnected when there is no session', async () => {
    await expect(handleEip1193Request(runtime(), { method: 'eth_accounts' })).resolves.toEqual([]);
  });

  it('routes to connected when a session exists', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    await expect(
      handleEip1193Request(runtime({ session }), { method: 'eth_accounts' })
    ).resolves.toEqual([ADDRESS]);
  });
});

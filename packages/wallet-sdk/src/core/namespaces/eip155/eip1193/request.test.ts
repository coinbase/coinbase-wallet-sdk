import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { sessionFromSolanaAccounts } from ':core/namespaces/solana/session.js';
import type { Session } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import * as providerUtil from ':util/provider.js';
import { sessionFromAccounts } from '../session.js';
import { createActiveChain } from './activeChain.js';
import type { Eip1193Context } from './context.js';
import { handleEip1193Request } from './request.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

function context(opts?: { session?: Session }): Eip1193Context {
  const request = vi.fn().mockResolvedValue({
    accounts: [{ address: ADDRESS, capabilities: {} }],
  });
  const state = {
    spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    paymasterUrls: { get: () => undefined, set: vi.fn() },
  } as unknown as Store['eip155'];
  const transport: WalletTransport = {
    handshake: vi.fn().mockResolvedValue(undefined),
    request,
    readSession: () => opts?.session,
    writeSession: vi.fn(),
    cleanup: vi.fn(),
  };
  return {
    transport,
    cache: state,
    config: { get: () => ({ version: 'test' }), set: vi.fn() },
    emit: vi.fn(),
    chain: createActiveChain({
      defaultChainId: 1,
      session: opts?.session,
      onChange: vi.fn(),
    }),
  };
}

describe('handleEip1193Request', () => {
  it('forwards disconnected wallet_getCallsStatus to Coinbase HTTP', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({ status: 200 });
    const args = { method: 'wallet_getCallsStatus', params: ['0x1'] };
    await expect(handleEip1193Request(context(), args)).resolves.toEqual({ status: 200 });
    expect(fetchRPC).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
    fetchRPC.mockRestore();
  });

  it('routes to disconnected when there is no session', async () => {
    await expect(handleEip1193Request(context(), { method: 'eth_accounts' })).resolves.toEqual([]);
  });

  it('routes to connected when a session exists', async () => {
    const session = {
      ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 }),
      sessionId: 'session-1',
    };
    await expect(
      handleEip1193Request(context({ session }), { method: 'eth_accounts' })
    ).resolves.toEqual([ADDRESS]);
  });

  it('routes a Solana-only session through disconnected EIP-1193 handling', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({ status: 200 });
    const session = sessionFromSolanaAccounts({
      accounts: ['So11111111111111111111111111111111111111112'],
    });
    session.sessionId = 'solana-session';
    const args = { method: 'wallet_getCallsStatus', params: ['0x1'] };

    await expect(handleEip1193Request(context({ session }), args)).resolves.toEqual({
      status: 200,
    });

    expect(fetchRPC).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
    fetchRPC.mockRestore();
  });
});

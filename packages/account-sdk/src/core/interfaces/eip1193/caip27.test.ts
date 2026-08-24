import { sessionFromAccounts } from ':core/session/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { handleConnected } from './connected.js';
import { handleDisconnected } from './disconnected.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

function runtime(send: WalletRuntime['transport']['send']): WalletRuntime {
  return {
    store: {
      account: {
        get: () => ({ accounts: [ADDRESS], chain: { id: 8453 } }),
        set: vi.fn(),
        clear: vi.fn(),
      },
      chains: { get: () => [], set: vi.fn(), clear: vi.fn() },
      subAccounts: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
      subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
    } as unknown as WalletRuntime['store'],
    chainId: () => 8453,
    handshake: vi.fn(),
    send: vi.fn(),
    transport: { kind: 'popup', send },
    readSession: () => undefined,
    writeSession: vi.fn(),
    cleanup: vi.fn(),
  };
}

describe('wallet_invokeMethod', () => {
  const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });

  it('invokes the inner wallet method with a CAIP-27 envelope', async () => {
    const send = vi.fn().mockResolvedValue('0xsig');
    const result = await handleConnected(
      runtime(send),
      {
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
        },
      },
      session
    );

    expect(result).toBe('0xsig');
    expect(send).toHaveBeenCalledWith({
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
    });
  });

  it('projects eth_accounts without hitting the transport', async () => {
    const send = vi.fn();
    const accounts = await handleConnected(
      runtime(send),
      {
        method: 'wallet_invokeMethod',
        params: {
          scope: 'eip155:8453',
          request: { method: 'eth_accounts', params: [] },
        },
      },
      session
    );

    expect(accounts).toEqual([ADDRESS]);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects invoke before a session exists', async () => {
    await expect(
      handleDisconnected(runtime(vi.fn()), {
        method: 'wallet_invokeMethod',
        params: { chainId: 'eip155:1', request: { method: 'personal_sign' } },
      })
    ).rejects.toMatchObject({ code: 4100 });
  });
});

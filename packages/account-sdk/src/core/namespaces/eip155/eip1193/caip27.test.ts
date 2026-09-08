import { sessionFromAccounts } from ':core/session/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import { handleConnected } from './connected.js';
import { handleDisconnected } from './disconnected.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const OWNER = '0x00000000000000000000000000000000000000aa' as const;

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
    transport: {
      kind: 'popup',
      send: async (envelope) => ({
        chainId: envelope.chainId,
        result: {
          method: envelope.request.method,
          result: await send(envelope),
        },
      }),
    },
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

  it('keeps direct wallet_invokeMethod on the CAIP-27 transport', async () => {
    const send = vi.fn().mockResolvedValue([ADDRESS]);
    const accounts = await handleConnected(
      runtime(send),
      {
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:8453',
          request: { method: 'eth_accounts', params: [] },
        },
      },
      session
    );

    expect(accounts).toEqual([ADDRESS]);
    expect(send).toHaveBeenCalledWith({
      chainId: 'eip155:8453',
      request: { method: 'eth_accounts', params: [] },
    });
  });

  it('injects SDK walletConnect capabilities into a direct inner wallet_connect', async () => {
    const send = vi.fn().mockResolvedValue({ accounts: [{ address: ADDRESS }] });
    const rt = runtime(send);
    let config: Record<string, unknown> = {
      creation: 'on-connect',
      toOwnerAccount: async () => ({ account: { type: 'local', address: OWNER } }),
    };
    rt.store.subAccountsConfig.get = () => config;
    rt.store.subAccountsConfig.set = (value) => {
      config = { ...config, ...value };
    };

    await handleConnected(
      rt,
      {
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:8453',
          request: {
            method: 'wallet_connect',
            params: [{ version: '1', capabilities: { custom: { enabled: true } } }],
          },
        },
      },
      session
    );

    expect(send).toHaveBeenCalledWith({
      chainId: 'eip155:8453',
      request: {
        method: 'wallet_connect',
        params: [
          {
            version: '1',
            capabilities: {
              addSubAccount: {
                account: {
                  type: 'create',
                  keys: [{ type: 'address', publicKey: OWNER }],
                },
              },
              custom: { enabled: true },
            },
          },
        ],
      },
    });
  });

  it('strictly rejects malformed direct invoke before pairing', async () => {
    await expect(
      handleDisconnected(runtime(vi.fn()), {
        method: 'wallet_invokeMethod',
        params: { chainId: 'eip155:1', request: { method: 'personal_sign' } },
      })
    ).rejects.toMatchObject({ code: -32602 });
  });
});

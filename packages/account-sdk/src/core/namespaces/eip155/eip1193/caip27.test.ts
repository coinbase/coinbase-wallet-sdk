import type { RequestArguments } from ':core/provider/interface.js';
import { sessionFromAccounts } from '../session.js';
import type { Envelope } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { handleConnected } from './connected.js';
import { createActiveChain } from './activeChain.js';
import type { Eip1193Context } from './context.js';
import { handleDisconnected } from './disconnected.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const OWNER = '0x00000000000000000000000000000000000000aa' as const;

function context(send: (envelope: Envelope) => Promise<unknown>): Eip1193Context {
  const state = {
    subAccounts: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
    subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
    spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    paymasterUrls: { get: () => undefined, set: vi.fn() },
  } as unknown as Store['eip155'];
  const transport: WalletTransport = {
    handshake: vi.fn(),
    request: async (request: RequestArguments) => {
      const envelope = request.params as Envelope;
      return {
        chainId: envelope.chainId,
        result: {
          method: envelope.request.method,
          result: await send(envelope),
        },
      };
    },
    readSession: () => undefined,
    writeSession: vi.fn(),
    cleanup: vi.fn(),
  };
  return {
    transport,
    cache: state,
    config: { get: () => ({ version: 'test' }), set: vi.fn() },
    emit: vi.fn(),
    chain: createActiveChain({
      defaultChainId: 8453,
      onChange: vi.fn(),
    }),
  };
}

describe('wallet_invokeMethod', () => {
  const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });

  it('invokes the inner wallet method with a CAIP-27 envelope', async () => {
    const send = vi.fn().mockResolvedValue('0xsig');
    const result = await handleConnected(
      context(send),
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
      context(send),
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

  it('translates a direct inner wallet_connect and its capabilities to CAIP-25', async () => {
    const transportSend = vi.fn();
    const rt = context(transportSend);
    const sessionSend = vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      scopes: {
        eip155: {
          chains: ['8453'],
          accounts: [ADDRESS],
          methods: ['wallet_connect'],
          notifications: ['accountsChanged', 'chainChanged'],
        },
      },
    });
    rt.transport.request = sessionSend;
    let config: Record<string, unknown> = {
      creation: 'on-connect',
      toOwnerAccount: async () => ({ account: { type: 'local', address: OWNER } }),
    };
    rt.cache.subAccountsConfig.get = () => config;
    rt.cache.subAccountsConfig.set = (value) => {
      config = { ...config, ...value };
    };

    await handleConnected(
      rt,
      {
        method: 'wallet_invokeMethod',
        params: {
          sessionId: 'session-1',
          chainId: 'eip155:8453',
          request: {
            method: 'wallet_connect',
            params: [{ version: '1', capabilities: { custom: { enabled: true } } }],
          },
        },
      },
      session
    );

    expect(sessionSend).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: {
        sessionId: 'session-1',
        scopes: {
          eip155: {
            chains: ['8453'],
            methods: expect.any(Array),
            notifications: ['accountsChanged', 'chainChanged'],
            capabilities: {
              addSubAccount: {
                account: {
                  type: 'create',
                  keys: [{ type: 'address', publicKey: OWNER }],
                },
              },
              custom: { enabled: true },
            },
            params: [{ version: '1' }],
          },
        },
      },
    });
    expect(transportSend).not.toHaveBeenCalled();
  });

  it('strictly rejects malformed direct invoke before pairing', async () => {
    await expect(
      handleDisconnected(context(vi.fn()), {
        method: 'wallet_invokeMethod',
        params: { chainId: 'eip155:1', request: { method: 'personal_sign' } },
      })
    ).rejects.toMatchObject({ code: -32602 });
  });
});

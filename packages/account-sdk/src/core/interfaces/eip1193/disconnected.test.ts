import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { createCaip27Request } from ':core/session/index.js';
import type { WalletRuntime } from ':core/transport/index.js';
import * as providerUtil from ':util/provider.js';
import { handleDisconnected } from './disconnected.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

function runtime(send: WalletRuntime['send'] = vi.fn()): WalletRuntime {
  let accounts: `0x${string}`[] = [];
  let chain = { id: 1 };
  let session: ReturnType<WalletRuntime['readSession']>;
  return {
    store: {
      account: {
        get: () => ({ accounts, chain }),
        set: vi.fn((value: { accounts?: `0x${string}`[]; chain?: { id: number } }) => {
          if (value.accounts) accounts = value.accounts;
          if (value.chain) chain = value.chain;
        }),
        clear: vi.fn(),
      },
      chains: { get: () => [], set: vi.fn(), clear: vi.fn() },
      subAccounts: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
      subAccountsConfig: { get: () => ({}), set: vi.fn(), clear: vi.fn() },
      spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
      session: { get: () => undefined, set: vi.fn(), clear: vi.fn() },
    } as unknown as WalletRuntime['store'],
    chainId: () => chain.id,
    handshake: vi.fn().mockResolvedValue(undefined),
    send,
    transport: { kind: 'popup', send: (envelope) => send(createCaip27Request(envelope)) },
    readSession: () => session,
    writeSession: vi.fn((value) => {
      session = value;
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
}

describe('handleDisconnected', () => {
  function caipWire(result: unknown = '0xok') {
    return vi.fn(async (request: RequestArguments) => {
      if (request.method === 'wallet_createSession') {
        const params = request.params as {
          scopes: Record<
            string,
            {
              chains?: string[];
              methods: string[];
              notifications: string[];
            }
          >;
        };
        return {
          sessionId: 'session-1',
          scopes: Object.fromEntries(
            Object.entries(params.scopes).map(([scopeKey, scope]) => [
              scopeKey,
              {
                ...(scope.chains ? { chains: scope.chains } : {}),
                accounts: [ADDRESS],
                methods: scope.methods,
                notifications: scope.notifications,
              },
            ])
          ),
        };
      }
      const params = request.params as {
        sessionId?: string;
        chainId: `eip155:${string}`;
        request: RequestArguments;
      };
      return {
        sessionId: params.sessionId,
        chainId: params.chainId,
        result: { method: params.request.method, result },
      };
    });
  }

  it('returns empty defaults before pairing', async () => {
    const rt = runtime();
    await expect(handleDisconnected(rt, { method: 'eth_accounts' })).resolves.toEqual([]);
    await expect(handleDisconnected(rt, { method: 'eth_chainId' })).resolves.toBe('0x1');
    await expect(handleDisconnected(rt, { method: 'net_version' })).resolves.toBe(1);
  });

  it('stores a local chain id on wallet_switchEthereumChain', async () => {
    const rt = runtime();
    await expect(
      handleDisconnected(rt, {
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      })
    ).resolves.toBeUndefined();
    expect(rt.store.account.set).toHaveBeenCalledWith({ chain: { id: 8453 } });
    await expect(handleDisconnected(rt, { method: 'eth_chainId' })).resolves.toBe('0x2105');
    await expect(handleDisconnected(rt, { method: 'net_version' })).resolves.toBe(8453);
  });

  it('pairs on eth_requestAccounts', async () => {
    const send = caipWire();
    const rt = runtime(send);
    await expect(handleDisconnected(rt, { method: 'eth_requestAccounts' })).resolves.toEqual([
      ADDRESS,
    ]);
    expect(rt.handshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({
          scopes: {
            eip155: expect.objectContaining({
              chains: ['1'],
              params: [{ version: '1' }],
            }),
          },
        }),
      })
    );
  });

  it('pairs before a direct wallet_invokeMethod and preserves its CAIP target', async () => {
    const send = caipWire('0xsig');
    await expect(
      handleDisconnected(runtime(send), {
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x01'] },
        },
      })
    ).resolves.toBe('0xsig');
    expect(send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({
          scopes: {
            eip155: expect.objectContaining({
              chains: ['8453'],
              params: [{ version: '1' }],
            }),
          },
        }),
      })
    );
    expect(send).toHaveBeenLastCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        sessionId: 'session-1',
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: ['0x01'] },
      },
    });
  });

  it.each(['wallet_sendCalls', 'wallet_sign', 'experimental_requestInfo'] as const)(
    'handshakes, invokes once, and cleans up disconnected %s',
    async (method) => {
      const order: string[] = [];
      const baseSend = caipWire('0xhash');
      const send = vi.fn(async (request: RequestArguments) => {
        order.push(request.method);
        return baseSend(request);
      });
      const rt = runtime(send);
      rt.handshake = vi.fn().mockImplementation(async () => {
        order.push('handshake');
      });
      rt.cleanup = vi.fn().mockImplementation(async () => {
        order.push('cleanup');
      });

      const params =
        method === 'wallet_sendCalls'
          ? [{ chainId: '0x1', calls: [], version: '1' }]
          : method === 'wallet_sign'
            ? [{ version: '1.0', data: {} }]
            : [{ requests: [] }];
      const args: RequestArguments = { method, params };

      await expect(handleDisconnected(rt, args)).resolves.toBe('0xhash');
      expect(rt.handshake).toHaveBeenCalledWith({ method: 'handshake' });
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith({
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:1',
          request: args,
        },
      });
      expect(rt.writeSession).not.toHaveBeenCalled();
      expect(order).toEqual(['handshake', 'wallet_invokeMethod', 'cleanup']);
    }
  );

  it('uses the one-shot path for a sessionless direct ephemeral invoke', async () => {
    const order: string[] = [];
    const send = vi.fn(async (request: RequestArguments) => {
      order.push(request.method);
      const params = request.params as {
        chainId: `eip155:${string}`;
        request: RequestArguments;
      };
      return {
        chainId: params.chainId,
        result: { method: params.request.method, result: '0xdirect' },
      };
    });
    const rt = runtime(send);
    rt.handshake = vi.fn(async () => {
      order.push('handshake');
    });
    rt.cleanup = vi.fn(async () => {
      order.push('cleanup');
    });

    await expect(
      handleDisconnected(rt, {
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:8453',
          request: { method: 'wallet_sign', params: [{ version: '1.0', data: {} }] },
        },
      })
    ).resolves.toBe('0xdirect');

    expect(send).toHaveBeenCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        chainId: 'eip155:8453',
        request: { method: 'wallet_sign', params: [{ version: '1.0', data: {} }] },
      },
    });
    expect(order).toEqual(['handshake', 'wallet_invokeMethod', 'cleanup']);
  });

  it('does not treat a sessionId-bearing direct invoke as ephemeral', async () => {
    const send = caipWire('0xsession');
    const rt = runtime(send);

    await expect(
      handleDisconnected(rt, {
        method: 'wallet_invokeMethod',
        params: {
          sessionId: 'session-1',
          chainId: 'eip155:1',
          request: { method: 'wallet_sign', params: [{ version: '1.0', data: {} }] },
        },
      })
    ).resolves.toBe('0xsession');

    expect(send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ method: 'wallet_createSession' })
    );
    expect(send).toHaveBeenLastCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        sessionId: 'session-1',
        chainId: 'eip155:1',
        request: { method: 'wallet_sign', params: [{ version: '1.0', data: {} }] },
      },
    });
    expect(rt.cleanup).not.toHaveBeenCalled();
  });

  it.each([
    ['method error', 'method', { code: 4100, message: 'method denied' }],
    ['transport error', 'transport', new Error('transport failed')],
    ['user denial', 'denial', { code: 4001, message: 'user denied' }],
  ] as const)('cleans up before throwing an ephemeral %s', async (_name, kind, expectedError) => {
    const order: string[] = [];
    const send = vi.fn(async (request: RequestArguments) => {
      order.push(request.method);
      if (kind === 'method') {
        return {
          chainId: 'eip155:1',
          error: expectedError,
        };
      }
      throw expectedError;
    });
    const rt = runtime(send);
    rt.handshake = vi.fn(async () => {
      order.push('handshake');
    });
    rt.cleanup = vi.fn(async () => {
      order.push('cleanup');
    });

    await expect(
      handleDisconnected(rt, {
        method: 'wallet_sendCalls',
        params: [{ chainId: '0x1', calls: [], version: '1' }],
      })
    ).rejects.toEqual(expectedError);

    expect(order).toEqual(['handshake', 'wallet_invokeMethod', 'cleanup']);
  });

  it('posts wallet_getCallsStatus to Coinbase HTTP', async () => {
    const fetchRPC = vi.spyOn(providerUtil, 'fetchRPCRequest').mockResolvedValue({ status: 200 });
    const args: RequestArguments = { method: 'wallet_getCallsStatus', params: ['0x1'] };
    await expect(handleDisconnected(runtime(), args)).resolves.toEqual({ status: 200 });
    expect(fetchRPC).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
    fetchRPC.mockRestore();
  });

  it('still rejects non-wallet methods before a session', async () => {
    await expect(handleDisconnected(runtime(), { method: 'eth_getBalance' })).rejects.toMatchObject(
      {
        code: standardErrorCodes.provider.unauthorized,
      }
    );
  });
});

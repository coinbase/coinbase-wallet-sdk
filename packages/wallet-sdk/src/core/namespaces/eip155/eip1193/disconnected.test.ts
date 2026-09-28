import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { WalletTransport } from ':core/transport/index.js';
import * as providerUtil from ':util/provider.js';
import { numberToHex } from 'viem';
import { createActiveChain } from './activeChain.js';
import type { Eip1193Context } from './context.js';
import { handleDisconnected } from './disconnected.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

function context(request: WalletTransport['request'] = vi.fn()): Eip1193Context {
  let session: ReturnType<WalletTransport['readSession']>;
  const emit = vi.fn();
  const transport: WalletTransport = {
    handshake: vi.fn().mockResolvedValue(undefined),
    request,
    readSession: () => session,
    writeSession: vi.fn((value) => {
      session = value;
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
  const chain = createActiveChain({
    onChange: (chainId) => emit('chainChanged', numberToHex(chainId)),
  });
  return {
    transport,
    emit,
    chain,
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
    const rt = context();
    await expect(handleDisconnected(rt, { method: 'eth_accounts' })).resolves.toEqual([]);
    await expect(handleDisconnected(rt, { method: 'eth_chainId' })).resolves.toBe('0x1');
    await expect(handleDisconnected(rt, { method: 'net_version' })).resolves.toBe(1);
  });

  it('announces a local chain id on wallet_switchEthereumChain', async () => {
    const rt = context();
    await expect(
      handleDisconnected(rt, {
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      })
    ).resolves.toBeUndefined();
    expect(rt.chain.get()).toBe(8453);
    // Every move the application can observe is announced, session or no session.
    expect(rt.emit).toHaveBeenCalledWith('chainChanged', '0x2105');
    await expect(handleDisconnected(rt, { method: 'eth_chainId' })).resolves.toBe('0x2105');
    await expect(handleDisconnected(rt, { method: 'net_version' })).resolves.toBe(8453);
  });

  it('pairs on eth_requestAccounts', async () => {
    const send = caipWire();
    const rt = context(send);
    await expect(handleDisconnected(rt, { method: 'eth_requestAccounts' })).resolves.toEqual([
      ADDRESS,
    ]);
    expect(rt.transport.handshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({
          scopes: {
            eip155: expect.objectContaining({
              params: [{ version: '1' }],
            }),
          },
        }),
      })
    );
  });

  it('rejects a direct wallet_invokeMethod that needs a session', async () => {
    // Connecting is the dapp's call to make. Wrapping a signing method in CAIP-27 is not
    // a request to connect, so it fails the same way the bare method would.
    const send = caipWire('0xsig');
    const rt = context(send);

    await expect(
      handleDisconnected(rt, {
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x01'] },
        },
      })
    ).rejects.toMatchObject({ code: standardErrorCodes.provider.unauthorized });

    expect(send).not.toHaveBeenCalled();
    expect(rt.transport.handshake).not.toHaveBeenCalled();
    expect(rt.transport.writeSession).not.toHaveBeenCalled();
  });

  it('pairs on a direct wallet_connect', async () => {
    const send = caipWire();
    const rt = context(send);

    await expect(
      handleDisconnected(rt, { method: 'wallet_connect', params: [{ version: '1' }] })
    ).resolves.toEqual({ accounts: [{ address: ADDRESS }] });

    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({
          scopes: {
            eip155: expect.objectContaining({
              methods: expect.arrayContaining(['wallet_connect']),
              params: [{ version: '1' }],
            }),
          },
        }),
      })
    );
    expect(rt.transport.readSession()?.namespaces.eip155?.accounts).toEqual([ADDRESS]);
  });

  it('rejects wallet_connect nested in wallet_invokeMethod', async () => {
    // `wallet_invokeMethod` invokes a method on a session that already exists, so it can
    // never be the thing that creates one. Pairing is `wallet_connect`, called directly.
    const send = caipWire();
    const rt = context(send);

    await expect(
      handleDisconnected(rt, {
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:1',
          request: { method: 'wallet_connect', params: [{ version: '1' }] },
        },
      })
    ).rejects.toThrow('wallet_connect cannot be nested inside wallet_invokeMethod');

    expect(send).not.toHaveBeenCalled();
    expect(rt.transport.handshake).not.toHaveBeenCalled();
    expect(rt.transport.writeSession).not.toHaveBeenCalled();
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
      const rt = context(send);
      rt.transport.handshake = vi.fn().mockImplementation(async () => {
        order.push('handshake');
      });
      rt.transport.cleanup = vi.fn().mockImplementation(async () => {
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
      expect(rt.transport.handshake).toHaveBeenCalledWith({ method: 'handshake' });
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith({
        method: 'wallet_invokeMethod',
        params: {
          chainId: 'eip155:1',
          request: args,
        },
      });
      expect(rt.transport.writeSession).not.toHaveBeenCalled();
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
    const rt = context(send);
    rt.transport.handshake = vi.fn(async () => {
      order.push('handshake');
    });
    rt.transport.cleanup = vi.fn(async () => {
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
    // `wallet_sign` is a one-shot method, but naming a session id asks for a persisted
    // session. That request cannot be served without one, and it must not be downgraded
    // to the keys-and-throw-away path.
    const send = caipWire('0xsession');
    const rt = context(send);

    await expect(
      handleDisconnected(rt, {
        method: 'wallet_invokeMethod',
        params: {
          sessionId: 'session-1',
          chainId: 'eip155:1',
          request: { method: 'wallet_sign', params: [{ version: '1.0', data: {} }] },
        },
      })
    ).rejects.toMatchObject({ code: standardErrorCodes.provider.unauthorized });

    expect(send).not.toHaveBeenCalled();
    expect(rt.transport.handshake).not.toHaveBeenCalled();
    expect(rt.transport.cleanup).not.toHaveBeenCalled();
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
    const rt = context(send);
    rt.transport.handshake = vi.fn(async () => {
      order.push('handshake');
    });
    rt.transport.cleanup = vi.fn(async () => {
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
    await expect(handleDisconnected(context(), args)).resolves.toEqual({ status: 200 });
    expect(fetchRPC).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
    fetchRPC.mockRestore();
  });

  it('still rejects non-wallet methods before a session', async () => {
    await expect(handleDisconnected(context(), { method: 'eth_getBalance' })).rejects.toMatchObject(
      {
        code: standardErrorCodes.provider.unauthorized,
      }
    );
  });

  it.each(['personal_sign', 'eth_sendTransaction', 'eth_signTypedData_v4', 'wallet_watchAsset'])(
    'rejects %s instead of connecting on the dapp behalf',
    async (method) => {
      // Connecting is `eth_requestAccounts` / `wallet_connect`. A signing request is not
      // consent to share an address, so it must not create a session as a side effect.
      const send = caipWire();
      const rt = context(send);

      await expect(handleDisconnected(rt, { method, params: [] })).rejects.toMatchObject({
        code: standardErrorCodes.provider.unauthorized,
      });

      expect(send).not.toHaveBeenCalled();
      expect(rt.transport.handshake).not.toHaveBeenCalled();
      expect(rt.transport.writeSession).not.toHaveBeenCalled();
    }
  );
});

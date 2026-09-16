import type { RequestArguments } from ':core/provider/interface.js';
import type { Session } from ':core/session/types.js';
import { sessionFromAccounts } from '../session.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { connectEip155, createEip155Scopes, walletConnectScopeRequestParts } from './connect.js';
import { createActiveChain } from './activeChain.js';
import type { Eip1193Context } from './context.js';

const ADDRESS = '0x0000000000000000000000000000000000000001';

function setup(
  request: WalletTransport['request'],
  opts?: {
    restored?: Session;
    chainId?: number;
  }
): { transport: WalletTransport; context: Eip1193Context } {
  let session = opts?.restored;
  const state = {
    spendPermissions: { get: () => [], set: vi.fn(), clear: vi.fn() },
    paymasterUrls: { get: () => undefined, set: vi.fn() },
  } as unknown as Store['eip155'];
  const transport: WalletTransport = {
    handshake: vi.fn().mockResolvedValue(undefined),
    request,
    readSession: () => session,
    writeSession: vi.fn((value) => {
      session = value;
    }),
    cleanup: vi.fn(),
  };
  const chain = createActiveChain({
    defaultChainId: opts?.chainId ?? 1,
    session,
    onChange: vi.fn(),
  });
  return {
    transport,
    context: {
      transport,
      cache: state,
      config: { get: () => ({ version: 'test' }), set: vi.fn() },
      emit: vi.fn(),
      chain,
    },
  };
}

function eip155Result(opts?: {
  sessionId?: string;
  chainId?: number;
  accounts?: string[];
  capabilities?: Record<string, unknown>;
}) {
  return {
    sessionId: opts?.sessionId ?? 'session-1',
    scopes: {
      eip155: {
        chains: [String(opts?.chainId ?? 1)],
        accounts: opts?.accounts ?? [ADDRESS],
        methods: ['personal_sign', 'wallet_connect'],
        notifications: ['accountsChanged', 'chainChanged'],
        ...(opts?.capabilities ? { capabilities: opts.capabilities } : {}),
      },
    },
  };
}

describe('EIP-155 CAIP-25 connect translation', () => {
  it('splits wallet_connect params into the private scope extension', () => {
    const request: RequestArguments = {
      method: 'wallet_connect',
      params: [
        {
          version: '2',
          optionalMetadata: 'preserved',
          capabilities: { signInWithEthereum: { nonce: 'dapp' } },
        },
      ],
    };

    expect(
      walletConnectScopeRequestParts(request, {
        signInWithEthereum: { nonce: 'sdk' },
        addSubAccount: { account: { type: 'create' } },
      })
    ).toEqual({
      capabilities: {
        signInWithEthereum: { nonce: 'dapp' },
        addSubAccount: { account: { type: 'create' } },
      },
      params: [{ version: '2', optionalMetadata: 'preserved' }],
    });
  });

  it('builds the EIP-155 CAIP-25 scope without leaking capabilities into params', () => {
    const scopes = createEip155Scopes({
      chainId: 'eip155:8453',
      methods: ['personal_sign', 'wallet_connect'],
      requestParts: {
        capabilities: { signInWithEthereum: { nonce: 'n' } },
        params: [{ version: '1', optionalMetadata: 'preserved' }],
      },
    });

    expect(scopes).toEqual({
      eip155: {
        chains: ['8453'],
        methods: ['personal_sign', 'wallet_connect'],
        notifications: ['accountsChanged', 'chainChanged'],
        capabilities: { signInWithEthereum: { nonce: 'n' } },
        params: [{ version: '1', optionalMetadata: 'preserved' }],
      },
    });
  });

  it('rejects non-EIP-155 session targets', () => {
    expect(() =>
      createEip155Scopes({
        chainId: 'solana:mainnet',
        methods: ['wallet_connect'],
        requestParts: { params: [{ version: '1' }] },
      })
    ).toThrowError(expect.objectContaining({ code: 4902 }));
  });

  it('creates a session, translates its result, and emits EIP-1193 events', async () => {
    const capabilities = { signInWithEthereum: { message: 'm' } };
    const send = vi.fn().mockResolvedValue(eip155Result({ capabilities }));
    const { transport, context } = setup(send);

    const { session, result } = await connectEip155(context, {
      method: 'wallet_connect',
      params: [{ version: '1' }],
    });

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_createSession' }));
    expect(result).toEqual({ accounts: [{ address: ADDRESS, capabilities }] });
    expect(transport.readSession()).toBe(session);
    expect(context.emit).toHaveBeenCalledWith('accountsChanged', [ADDRESS]);
    expect(context.emit).toHaveBeenCalledWith('connect', { chainId: '0x1' });
  });

  it('updates an existing session id without a new handshake', async () => {
    const restored = {
      ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 }),
      sessionId: 'session-1',
    };
    const send = vi.fn().mockResolvedValue(eip155Result({ sessionId: 'session-1' }));
    const { transport, context } = setup(send, { restored });

    await connectEip155(context, undefined, { sessionId: 'session-1' });

    expect(transport.handshake).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'wallet_createSession',
        params: expect.objectContaining({ sessionId: 'session-1' }),
      })
    );
  });

  it('does not emit when CAIP-25 grants no accounts', async () => {
    const send = vi.fn().mockResolvedValue(eip155Result({ accounts: [] }));
    const { context } = setup(send);

    await expect(connectEip155(context)).rejects.toMatchObject({ code: 4100 });
    expect(context.emit).not.toHaveBeenCalled();
  });
});

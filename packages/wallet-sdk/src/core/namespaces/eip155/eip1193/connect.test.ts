import type { Session } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';
import { EIP155_METHODS } from '../methods.js';
import { sessionFromAccounts } from '../session.fixtures.js';
import { createActiveChain } from './activeChain.js';
import { connectEip155, walletConnectToCaip25Scopes } from './connect.js';
import type { Eip1193Context } from './context.js';

const ADDRESS = '0x0000000000000000000000000000000000000001';

function setup(
  request: WalletTransport['request'],
  opts?: {
    restored?: Session;
  }
): { transport: WalletTransport; context: Eip1193Context } {
  let session = opts?.restored;
  const transport: WalletTransport = {
    handshake: vi.fn().mockResolvedValue(undefined),
    request,
    readSession: () => session,
    writeSession: vi.fn((value) => {
      session = value;
    }),
    cleanup: vi.fn(),
  };
  const chain = createActiveChain({ onChange: vi.fn() });
  return {
    transport,
    context: {
      transport,
      emit: vi.fn(),
      chain,
    },
  };
}

function eip155Result(opts?: {
  sessionId?: string;
  accounts?: string[];
  capabilities?: Record<string, unknown>;
}) {
  return {
    sessionId: opts?.sessionId ?? 'session-1',
    scopes: {
      eip155: {
        accounts: opts?.accounts ?? [ADDRESS],
        methods: ['personal_sign', 'wallet_connect'],
        notifications: ['accountsChanged', 'chainChanged'],
        ...(opts?.capabilities ? { capabilities: opts.capabilities } : {}),
      },
    },
  };
}

describe('EIP-155 CAIP-25 connect translation', () => {
  it("puts the dapp's version and capabilities on the eip155 scope and drops anything else", () => {
    expect(
      walletConnectToCaip25Scopes([
        {
          version: '2',
          optionalMetadata: 'dropped',
          capabilities: { signInWithEthereum: { nonce: 'dapp' } },
        },
      ])
    ).toEqual({
      eip155: {
        methods: EIP155_METHODS,
        notifications: ['accountsChanged', 'chainChanged'],
        capabilities: { signInWithEthereum: { nonce: 'dapp' } },
        version: '2',
      },
    });
  });

  it('defaults the wallet_connect version to 1', () => {
    expect(walletConnectToCaip25Scopes(undefined).eip155?.version).toBe('1');
    expect(walletConnectToCaip25Scopes([{ version: '' }]).eip155?.version).toBe('1');
  });

  it('leaves out an empty capabilities object', () => {
    expect(
      walletConnectToCaip25Scopes([{ version: '1', capabilities: {} }]).eip155
    ).not.toHaveProperty('capabilities');
  });

  it('always requests the whole eip155 namespace, never a single chain', () => {
    const scopes = walletConnectToCaip25Scopes([{ version: '1' }]);

    // Connect can no longer be narrowed to (or fail on) a specific chain: there is
    // exactly one EVM scope, keyed by the bare namespace with no `chains` array.
    expect(Object.keys(scopes)).toEqual(['eip155']);
    expect(scopes.eip155).not.toHaveProperty('chains');
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

  it("returns each account's own capability answers when the wallet sends them per account", async () => {
    const OTHER = '0x0000000000000000000000000000000000000002';
    const send = vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      scopes: {
        eip155: {
          accounts: [ADDRESS, OTHER],
          methods: ['personal_sign', 'wallet_connect'],
          notifications: ['accountsChanged', 'chainChanged'],
          capabilities: { paymasterService: { supported: true } },
          accountCapabilities: {
            [ADDRESS]: { signInWithEthereum: { message: 'first' } },
            [OTHER]: { signInWithEthereum: { message: 'second' } },
          },
        },
      },
    });
    const { context } = setup(send);

    const { result } = await connectEip155(context, {
      method: 'wallet_connect',
      params: [{ version: '1' }],
    });

    expect(result).toEqual({
      accounts: [
        { address: ADDRESS, capabilities: { signInWithEthereum: { message: 'first' } } },
        { address: OTHER, capabilities: { signInWithEthereum: { message: 'second' } } },
      ],
    });
  });

  it('updates the stored session id without a new handshake', async () => {
    const restored = {
      ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 }),
      sessionId: 'session-1',
    };
    const send = vi.fn().mockResolvedValue(eip155Result({ sessionId: 'session-1' }));
    const { transport, context } = setup(send, { restored });

    await connectEip155(context);

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

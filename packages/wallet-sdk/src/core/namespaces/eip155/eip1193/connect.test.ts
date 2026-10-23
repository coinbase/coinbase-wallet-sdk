import type { Session } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';
import { sessionFromAccounts } from '../session.fixtures.js';
import { createActiveChain } from './activeChain.js';
import { connectEip155 } from './connect.js';
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
  accounts?: string[];
  capabilities?: Record<string, unknown>;
}) {
  const accounts = opts?.accounts ?? [ADDRESS];
  return {
    scopes: {
      eip155: {
        accounts,
        methods: ['personal_sign', 'wallet_connect'],
        notifications: ['accountsChanged', 'chainChanged'],
        ...(opts?.capabilities
          ? {
              accountCapabilities: Object.fromEntries(
                accounts.map((account) => [account, opts.capabilities])
              ),
            }
          : {}),
      },
    },
  };
}

describe('connectEip155', () => {
  it('creates a session, translates its result, and emits EIP-1193 events', async () => {
    const capabilities = { signInWithEthereum: { message: 'm' } };
    const send = vi.fn().mockResolvedValue(eip155Result({ capabilities }));
    const { transport, context } = setup(send);

    const { session, result } = await connectEip155(context, [{ version: '1' }]);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_createSession' }));
    expect(result).toEqual({ accounts: [{ address: ADDRESS, capabilities }] });
    expect(transport.readSession()).toBe(session);
    expect(context.emit).toHaveBeenCalledWith('accountsChanged', [ADDRESS]);
    expect(context.emit).toHaveBeenCalledWith('connect', { chainId: '0x1' });
  });

  it("returns each account's own capability answers when the wallet sends them per account", async () => {
    const OTHER = '0x0000000000000000000000000000000000000002';
    const send = vi.fn().mockResolvedValue({
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

    const { result } = await connectEip155(context, [{ version: '1' }]);

    expect(result).toEqual({
      accounts: [
        { address: ADDRESS, capabilities: { signInWithEthereum: { message: 'first' } } },
        { address: OTHER, capabilities: { signInWithEthereum: { message: 'second' } } },
      ],
    });
  });

  it('updates the saved session without a new handshake', async () => {
    const restored = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    const send = vi.fn().mockResolvedValue(eip155Result());
    const { transport, context } = setup(send, { restored });

    await connectEip155(context, [{ version: '1' }]);

    expect(transport.handshake).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_createSession' }));
    expect(send.mock.calls[0]?.[0]).not.toHaveProperty('params.sessionId');
  });

  it('does not emit when CAIP-25 grants no accounts', async () => {
    const send = vi.fn().mockResolvedValue(eip155Result({ accounts: [] }));
    const { context } = setup(send);

    await expect(connectEip155(context, [{ version: '1' }])).rejects.toMatchObject({ code: 4100 });
    expect(context.emit).not.toHaveBeenCalled();
  });
});

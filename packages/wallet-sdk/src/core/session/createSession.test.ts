import { standardErrors } from ':core/error/errors.js';
import {
  createSolanaMainnetScopes,
  sessionFromSolanaAccounts,
} from ':core/namespaces/solana/session.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { WalletTransport } from ':core/transport/index.js';
import { createSession } from './createSession.js';

const SOLANA_PUBLIC_KEY = 'So11111111111111111111111111111111111111112';
const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;

function transport(
  request: WalletTransport['request'],
  restored?: ReturnType<WalletTransport['readSession']>
) {
  let session = restored;
  return {
    handshake: vi.fn().mockResolvedValue(undefined),
    request,
    readSession: () => session,
    writeSession: vi.fn((value) => {
      session = value;
    }),
    cleanup: vi.fn(),
  } satisfies WalletTransport;
}

function solanaResult(sessionId = 'solana-session') {
  return {
    sessionId,
    scopes: {
      solana: {
        chains: ['5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
        accounts: [SOLANA_PUBLIC_KEY],
        methods: ['solana_signMessage', 'solana_signTransaction'],
        notifications: [],
      },
    },
  };
}

describe('createSession', () => {
  it('creates and persists an authoritative CAIP-25 session', async () => {
    const send = vi.fn().mockResolvedValue(solanaResult());
    const rt = transport(send);

    const session = await createSession(rt, {
      scopes: createSolanaMainnetScopes(),
    });

    expect(rt.handshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(send).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: { scopes: createSolanaMainnetScopes() },
    });
    expect(rt.readSession()).toBe(session);
    expect(session).not.toHaveProperty('selected');
  });

  it('persists a partial grant without applying namespace policy', async () => {
    const send = vi.fn().mockResolvedValue({
      sessionId: 'partial-session',
      scopes: {
        'eip155:1': {
          accounts: ['0x0000000000000000000000000000000000000001'],
          methods: ['personal_sign'],
          notifications: [],
        },
        [SOLANA_MAINNET]: {
          accounts: [],
          methods: [],
          notifications: [],
        },
      },
    });
    const rt = transport(send);

    const session = await createSession(rt, {
      scopes: createSolanaMainnetScopes(),
    });

    expect(session.scopes[SOLANA_MAINNET]?.accounts).toEqual([]);
    expect(session.scopes['eip155:1']?.accounts).toHaveLength(1);
    expect(rt.readSession()).toBe(session);
  });

  it('reuses restored keys when updating the same session', async () => {
    const restored = {
      ...sessionFromSolanaAccounts({ accounts: [SOLANA_PUBLIC_KEY] }),
      sessionId: 'solana-session',
    };
    const send = vi.fn().mockResolvedValue(solanaResult());
    const rt = transport(send, restored);

    await createSession(rt, {
      scopes: createSolanaMainnetScopes(),
    });

    expect(rt.handshake).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ sessionId: 'solana-session' }),
      })
    );
  });

  it('retries a stale session once without its id', async () => {
    const restored = {
      ...sessionFromSolanaAccounts({ accounts: [SOLANA_PUBLIC_KEY] }),
      sessionId: 'stale-session',
    };
    const send = vi
      .fn<(request: RequestArguments) => Promise<unknown>>()
      .mockRejectedValueOnce(standardErrors.provider.unauthorized())
      .mockResolvedValueOnce(solanaResult('fresh-session'));
    const rt = transport(send, restored);

    const session = await createSession(rt, {
      scopes: createSolanaMainnetScopes(),
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toHaveProperty('params.sessionId', 'stale-session');
    expect(send.mock.calls[1]?.[0]).not.toHaveProperty('params.sessionId');
    expect(rt.handshake).toHaveBeenCalledOnce();
    expect(session.sessionId).toBe('fresh-session');
  });

  it('does not retry errors other than stale authorization', async () => {
    const error = standardErrors.provider.userRejectedRequest();
    const restored = {
      ...sessionFromSolanaAccounts({ accounts: [SOLANA_PUBLIC_KEY] }),
      sessionId: 'session',
    };
    const send = vi.fn().mockRejectedValue(error);
    const rt = transport(send, restored);

    await expect(
      createSession(rt, {
        scopes: createSolanaMainnetScopes(),
      })
    ).rejects.toBe(error);
    expect(send).toHaveBeenCalledOnce();
    expect(rt.handshake).not.toHaveBeenCalled();
  });
});

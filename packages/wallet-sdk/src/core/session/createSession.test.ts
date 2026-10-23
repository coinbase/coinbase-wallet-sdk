import { standardErrors } from ':core/error/errors.js';
import {
  createSolanaMainnetScopes,
  sessionFromSolanaAccounts,
} from ':core/namespaces/solana/session.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { WalletTransport } from ':core/transport/index.js';
import { createSession } from './createSession.js';

const SOLANA_PUBLIC_KEY = 'So11111111111111111111111111111111111111112';

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

function solanaResult() {
  return {
    scopes: {
      solana: {
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

    const session = await createSession(rt, createSolanaMainnetScopes());

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
      scopes: {
        eip155: {
          accounts: ['0x0000000000000000000000000000000000000001'],
          methods: ['personal_sign'],
          notifications: [],
        },
        solana: {
          accounts: [],
          methods: [],
          notifications: [],
        },
      },
    });
    const rt = transport(send);

    const session = await createSession(rt, createSolanaMainnetScopes());

    expect(session.namespaces.solana?.accounts).toEqual([]);
    expect(session.namespaces.eip155?.accounts).toHaveLength(1);
    expect(rt.readSession()).toBe(session);
  });

  it('updates over the saved pairing without a handshake', async () => {
    const restored = sessionFromSolanaAccounts({ accounts: [SOLANA_PUBLIC_KEY] });
    const send = vi.fn().mockResolvedValue(solanaResult());
    const rt = transport(send, restored);

    await createSession(rt, createSolanaMainnetScopes());

    expect(rt.handshake).not.toHaveBeenCalled();
    // No session id: the wallet merges into the pairing the request arrives on.
    expect(send).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: { scopes: createSolanaMainnetScopes() },
    });
  });

  it('never retries a 4100, so a decline does not re-prompt', async () => {
    // The wallet answers 4100 both for a pairing it no longer holds and for an
    // approval that granted nothing. Retrying would re-prompt the second user.
    const error = standardErrors.provider.unauthorized();
    const restored = sessionFromSolanaAccounts({ accounts: [SOLANA_PUBLIC_KEY] });
    const send = vi.fn<(request: RequestArguments) => Promise<unknown>>().mockRejectedValue(error);
    const rt = transport(send, restored);

    await expect(createSession(rt, createSolanaMainnetScopes())).rejects.toBe(error);
    expect(send).toHaveBeenCalledOnce();
    expect(rt.handshake).not.toHaveBeenCalled();
    expect(rt.writeSession).not.toHaveBeenCalled();
  });

  it('clears the session on a 4100, so the next connect starts clean', async () => {
    const restored = sessionFromSolanaAccounts({ accounts: [SOLANA_PUBLIC_KEY] });
    const rt = transport(
      vi.fn().mockRejectedValue(standardErrors.provider.unauthorized()),
      restored
    );

    await expect(createSession(rt, createSolanaMainnetScopes())).rejects.toMatchObject({
      code: 4100,
    });
    expect(rt.cleanup).toHaveBeenCalledOnce();
  });

  it('does not retry other errors either', async () => {
    const error = standardErrors.provider.userRejectedRequest();
    const restored = sessionFromSolanaAccounts({ accounts: [SOLANA_PUBLIC_KEY] });
    const send = vi.fn().mockRejectedValue(error);
    const rt = transport(send, restored);

    await expect(createSession(rt, createSolanaMainnetScopes())).rejects.toBe(error);
    expect(send).toHaveBeenCalledOnce();
    expect(rt.handshake).not.toHaveBeenCalled();
    expect(rt.cleanup).not.toHaveBeenCalled();
  });
});

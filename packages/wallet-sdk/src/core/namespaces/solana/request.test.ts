import { standardErrorCodes } from ':core/error/constants.js';
import { sessionFromAccounts } from ':core/namespaces/eip155/session.fixtures.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { Envelope, Session } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';
import { SOLANA_MAINNET, SOLANA_NAMESPACE } from './caip.js';
import { handleSolanaRequest } from './request.js';
import { sessionFromSolanaAccounts } from './session.js';

const PUBLIC_KEY = 'So11111111111111111111111111111111111111112';
const EVM_ADDRESS = '0x0000000000000000000000000000000000000001';
const SIGNATURE = btoa(String.fromCharCode(...new Uint8Array(64).fill(1)));

function transportState(initialSession?: Session) {
  let session = initialSession;
  const send = vi.fn(async (request: RequestArguments) => {
    const params = request.params as {
      sessionId?: string;
      scopes: Record<string, { methods: string[]; notifications: string[] }>;
    };
    const scope = params.scopes[SOLANA_NAMESPACE];
    return {
      sessionId: params.sessionId ?? 'solana-session',
      scopes: {
        [SOLANA_NAMESPACE]: {
          accounts: [PUBLIC_KEY],
          methods: scope.methods,
          notifications: scope.notifications,
        },
      },
    };
  });
  const transportSend = vi.fn(async (envelope: Envelope) => {
    let result: unknown;
    switch (envelope.request.method) {
      case 'solana_signMessage':
        result = { signature: SIGNATURE };
        break;
      case 'solana_signTransaction':
        result = { signedTransaction: 'AQ==' };
        break;
      case 'solana_signAndSendTransaction':
        result = { signature: SIGNATURE };
        break;
      default:
        result = [{ status: 'fulfilled', value: { signature: SIGNATURE } }];
    }
    return {
      ...(envelope.sessionId ? { sessionId: envelope.sessionId } : {}),
      chainId: envelope.chainId,
      result: { method: envelope.request.method, result },
    };
  });
  const cleanup = vi.fn(async () => {
    session = undefined;
  });
  const transport: WalletTransport = {
    handshake: vi.fn().mockResolvedValue(undefined),
    request: (request) =>
      request.method === 'wallet_createSession'
        ? send(request)
        : transportSend(request.params as Envelope),
    readSession: () => session,
    writeSession: (next) => {
      session = next;
    },
    cleanup,
  };
  return { transport, send, transportSend, cleanup };
}

describe('handleSolanaRequest', () => {
  it('pairs a Solana mainnet session and returns raw public keys', async () => {
    const state = transportState();

    await expect(handleSolanaRequest(state.transport, { method: 'connect' })).resolves.toEqual([
      PUBLIC_KEY,
    ]);

    expect(state.transport.handshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(state.send).toHaveBeenCalledWith({
      method: 'wallet_createSession',
      params: {
        scopes: {
          [SOLANA_NAMESPACE]: {
            methods: [
              'solana_signMessage',
              'solana_signTransaction',
              'solana_signAndSendTransaction',
              'solana_signAndSendAllTransactions',
              'coinbase_signPreparedCalls',
            ],
            notifications: [],
          },
        },
      },
    });
    expect(state.transport.readSession()).not.toHaveProperty('selected');
  });

  it('reuses a Solana session that already covers required methods', async () => {
    const session = {
      ...sessionFromSolanaAccounts({ accounts: [PUBLIC_KEY] }),
      sessionId: 'solana-session',
    };
    const state = transportState(session);

    await expect(handleSolanaRequest(state.transport, { method: 'connect' })).resolves.toEqual([
      PUBLIC_KEY,
    ]);

    expect(state.transport.handshake).not.toHaveBeenCalled();
    expect(state.send).not.toHaveBeenCalled();
  });

  it('extends an EVM session and preserves every wallet-authoritative grant', async () => {
    const evmSession = {
      ...sessionFromAccounts({ accounts: [EVM_ADDRESS], chainId: 1 }),
      sessionId: 'shared-session',
    };
    const state = transportState(evmSession);
    // The Solana grant comes back chain-keyed here: a namespace with no namespace
    // grant takes its lone chain scope as the grant.
    state.send.mockResolvedValueOnce({
      sessionId: 'shared-session',
      scopes: {
        eip155: {
          accounts: [EVM_ADDRESS],
          methods: ['personal_sign'],
          notifications: ['accountsChanged'],
        },
        [SOLANA_MAINNET]: {
          accounts: [PUBLIC_KEY],
          methods: [
            'solana_signMessage',
            'solana_signTransaction',
            'solana_signAndSendTransaction',
            'solana_signAndSendAllTransactions',
          ],
          notifications: [],
        },
      },
    } as never);

    await handleSolanaRequest(state.transport, { method: 'connect' });

    expect(state.send).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ sessionId: 'shared-session' }),
      })
    );
    expect(state.transport.readSession()?.namespaces).toMatchObject({
      eip155: { accounts: [EVM_ADDRESS] },
      solana: { accounts: [PUBLIC_KEY] },
    });
  });

  it('rejects Solana connect after persisting an EVM-only partial grant', async () => {
    const evmSession = {
      ...sessionFromAccounts({ accounts: [EVM_ADDRESS], chainId: 1 }),
      sessionId: 'shared-session',
    };
    const state = transportState(evmSession);
    state.send.mockResolvedValueOnce({
      sessionId: 'shared-session',
      scopes: {
        eip155: {
          accounts: [EVM_ADDRESS],
          methods: ['personal_sign'],
          notifications: [],
        },
        [SOLANA_MAINNET]: {
          accounts: [],
          methods: [],
          notifications: [],
        },
      },
    } as never);

    await expect(handleSolanaRequest(state.transport, { method: 'connect' })).rejects.toMatchObject(
      {
        code: standardErrorCodes.provider.unauthorized,
        message: 'wallet_createSession did not grant a Solana mainnet account',
      }
    );
    expect(state.transport.readSession()?.namespaces.eip155?.accounts).toEqual([EVM_ADDRESS]);
  });

  it('invokes signing through the exact Solana CAIP-27 envelope', async () => {
    const session = {
      ...sessionFromSolanaAccounts({ accounts: [PUBLIC_KEY] }),
      sessionId: 'solana-session',
    };
    const state = transportState(session);

    await expect(
      handleSolanaRequest(state.transport, {
        method: 'solana_signMessage',
        params: { pubkey: PUBLIC_KEY, message: new TextEncoder().encode('hello') },
      })
    ).resolves.toEqual({ signature: new Uint8Array(64).fill(1) });

    expect(state.transportSend).toHaveBeenCalledWith({
      sessionId: 'solana-session',
      chainId: SOLANA_MAINNET,
      request: {
        method: 'solana_signMessage',
        params: { pubkey: PUBLIC_KEY, message: 'aGVsbG8=' },
      },
    });
  });

  it('invokes single and batch sign-and-send methods through CAIP-27', async () => {
    const session = {
      ...sessionFromSolanaAccounts({ accounts: [PUBLIC_KEY] }),
      sessionId: 'solana-session',
    };
    const state = transportState(session);

    await expect(
      handleSolanaRequest(state.transport, {
        method: 'solana_signAndSendTransaction',
        params: {
          pubkey: PUBLIC_KEY,
          transaction: new Uint8Array([1]),
          options: { skipPreflight: true },
        },
      })
    ).resolves.toEqual({ signature: new Uint8Array(64).fill(1) });
    await expect(
      handleSolanaRequest(state.transport, {
        method: 'solana_signAndSendAllTransactions',
        params: {
          inputs: [{ pubkey: PUBLIC_KEY, transaction: new Uint8Array([2]) }],
          options: { mode: 'parallel' },
        },
      })
    ).resolves.toEqual([
      {
        status: 'fulfilled',
        value: { signature: new Uint8Array(64).fill(1) },
      },
    ]);

    expect(state.transportSend).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        request: expect.objectContaining({ method: 'solana_signAndSendTransaction' }),
      })
    );
    expect(state.transportSend).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        request: expect.objectContaining({ method: 'solana_signAndSendAllTransactions' }),
      })
    );
  });

  it('invokes prepared calls through CAIP-27 without naming a signer', async () => {
    const state = transportState({
      ...sessionFromSolanaAccounts({ accounts: [PUBLIC_KEY] }),
      sessionId: 'solana-session',
    });
    const walletResult = { opaque: 'wallet result' };
    state.transportSend.mockResolvedValueOnce({
      sessionId: 'solana-session',
      chainId: SOLANA_MAINNET,
      result: { method: 'coinbase_signPreparedCalls', result: walletResult },
    } as never);

    await expect(
      handleSolanaRequest(state.transport, {
        method: 'coinbase_signPreparedCalls',
        params: [{ opaque: 'params' }],
      })
    ).resolves.toBe(walletResult);

    expect(state.transportSend).toHaveBeenCalledWith({
      sessionId: 'solana-session',
      chainId: SOLANA_MAINNET,
      request: {
        method: 'coinbase_signPreparedCalls',
        params: [{ opaque: 'params' }],
      },
    });
  });

  it('passes prepared-call error data from the wallet through unchanged', async () => {
    const state = transportState({
      ...sessionFromSolanaAccounts({ accounts: [PUBLIC_KEY] }),
      sessionId: 'solana-session',
    });
    const data = { opaque: 'wallet error data' };
    state.transportSend.mockResolvedValueOnce({
      sessionId: 'solana-session',
      chainId: SOLANA_MAINNET,
      error: { code: -32603, message: 'Wallet error', data },
    } as never);

    await expect(
      handleSolanaRequest(state.transport, {
        method: 'coinbase_signPreparedCalls',
        params: [{ opaque: 'params' }],
      })
    ).rejects.toEqual({ code: -32603, message: 'Wallet error', data });
  });

  it('requires a Solana session for prepared calls', async () => {
    const state = transportState();

    await expect(
      handleSolanaRequest(state.transport, {
        method: 'coinbase_signPreparedCalls',
        params: [{ opaque: 'params' }],
      })
    ).rejects.toMatchObject({ code: standardErrorCodes.provider.unauthorized });
    expect(state.transport.handshake).not.toHaveBeenCalled();
    expect(state.transportSend).not.toHaveBeenCalled();
  });

  it('does not treat an EVM-only session as Solana-connected', async () => {
    const state = transportState(
      sessionFromAccounts({ accounts: ['0x0000000000000000000000000000000000000001'], chainId: 1 })
    );

    await expect(
      handleSolanaRequest(state.transport, {
        method: 'solana_signTransaction',
        params: { pubkey: PUBLIC_KEY, transaction: new Uint8Array([1]) },
      })
    ).rejects.toMatchObject({
      code: standardErrorCodes.provider.unauthorized,
    });
    expect(state.transportSend).not.toHaveBeenCalled();
  });

  it('cleans up only when the shared session contains Solana', async () => {
    const evm = transportState(
      sessionFromAccounts({
        accounts: ['0x0000000000000000000000000000000000000001'],
        chainId: 1,
      })
    );
    await handleSolanaRequest(evm.transport, { method: 'disconnect' });
    expect(evm.cleanup).not.toHaveBeenCalled();

    const solana = transportState({
      ...sessionFromSolanaAccounts({ accounts: [PUBLIC_KEY] }),
      sessionId: 'solana-session',
    });
    await handleSolanaRequest(solana.transport, { method: 'disconnect' });
    expect(solana.cleanup).toHaveBeenCalledTimes(1);
  });

  it('rejects methods outside the Solana interface', async () => {
    await expect(
      handleSolanaRequest(transportState().transport, {
        method: 'solana_unknown',
      } as never)
    ).rejects.toMatchObject({
      code: standardErrorCodes.provider.unsupportedMethod,
    });
  });
});

import { standardErrorCodes } from ':core/error/constants.js';
import { eip155Translator } from ':core/namespaces/eip155/index.js';
import { sessionFromAccounts } from ':core/namespaces/eip155/session.fixtures.js';
import {
  SOLANA_MAINNET,
  sessionFromSolanaAccounts,
  solanaTranslator,
} from ':core/namespaces/solana/index.js';
import type { WalletTransport } from ':core/transport/index.js';
import { Address } from ':core/type/index.js';
import { invoke, invokeEphemeral } from './invoke.js';
import type { Envelope } from './types.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;
const OTHER = '0x0000000000000000000000000000000000000001' as Address;
const SOLANA = SOLANA_MAINNET;

function transport(request: WalletTransport['request'] = vi.fn()): WalletTransport {
  return {
    handshake: vi.fn(),
    request,
    readSession: () => undefined,
    writeSession: vi.fn(),
    cleanup: vi.fn(),
  };
}

describe('invoke', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('qualifies the envelope and unwraps the CAIP-27 result', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.sessionId = 'session-1';
    const response = {
      sessionId: 'session-1',
      chainId: 'eip155:8453',
      result: { method: 'personal_sign', result: '0xsig' },
    };
    const send = vi.fn().mockResolvedValue(response);

    await expect(
      invoke(
        session,
        {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
        },
        transport(send),
        eip155Translator
      )
    ).resolves.toBe('0xsig');

    expect(send).toHaveBeenCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        sessionId: 'session-1',
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
      },
    });
  });

  it('sends and unwraps a persistent invoke without a session id', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const envelope: Envelope = {
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
    };
    const response = {
      chainId: envelope.chainId,
      result: { method: envelope.request.method, result: '0xsig' },
    };
    const send = vi.fn().mockResolvedValue(response);

    await expect(invoke(session, envelope, transport(send), eip155Translator)).resolves.toBe(
      '0xsig'
    );

    expect(send).toHaveBeenCalledWith({ method: 'wallet_invokeMethod', params: envelope });
    expect(send.mock.calls[0]?.[0]).not.toHaveProperty('params.sessionId');
  });

  it('unwraps an ephemeral response without session qualification', async () => {
    const envelope: Envelope = {
      chainId: 'eip155:8453',
      request: { method: 'wallet_sendCalls', params: [{ calls: [] }] },
    };
    const response = {
      chainId: envelope.chainId,
      result: { method: envelope.request.method, result: '0xhash' },
    };
    const send = vi.fn().mockResolvedValue(response);
    const qualify = vi.spyOn(eip155Translator, 'qualify');

    await expect(invokeEphemeral(envelope, transport(send), eip155Translator)).resolves.toBe(
      '0xhash'
    );

    expect(send).toHaveBeenCalledWith({ method: 'wallet_invokeMethod', params: envelope });
    expect(qualify).not.toHaveBeenCalled();
  });

  it('rejects an ephemeral session id before calling the transport', async () => {
    const envelope: Envelope = {
      sessionId: 'session-1',
      chainId: 'eip155:8453',
      request: { method: 'wallet_sendCalls', params: [{ calls: [] }] },
    };
    const send = vi.fn();

    await expect(
      invokeEphemeral(envelope, transport(send), eip155Translator)
    ).rejects.toMatchObject({
      code: standardErrorCodes.rpc.invalidParams,
      message: expect.stringContaining('sessionId'),
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('throws an enveloped method error and preserves top-level transport errors', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const methodError = { code: 4100, message: 'method denied' };
    const methodTransport = transport(
      vi.fn().mockResolvedValue({
        chainId: 'eip155:8453',
        error: methodError,
      })
    );
    await expect(
      invoke(
        session,
        {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: [] },
        },
        methodTransport,
        eip155Translator
      )
    ).rejects.toEqual(methodError);

    const transportError = { code: 4900, message: 'transport failed' };
    await expect(
      invoke(
        session,
        {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: [] },
        },
        transport(vi.fn().mockRejectedValue(transportError)),
        eip155Translator
      )
    ).rejects.toBe(transportError);
  });

  it('rejects a from that is not in the session', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const send = vi.fn();

    await expect(
      invoke(
        session,
        {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x68656c6c6f', OTHER] },
        },
        transport(send),
        eip155Translator
      )
    ).rejects.toThrow(/not granted on the target chain/);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects a chainId the session does not cover', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const send = vi.fn();

    await expect(
      invoke(
        session,
        {
          chainId: SOLANA,
          request: { method: 'solana_signMessage', params: [] },
        },
        transport(send),
        solanaTranslator
      )
    ).rejects.toThrow(/not in the session/);
    expect(send).not.toHaveBeenCalled();
  });

  it('delegates a covered Solana request to the registered translator', async () => {
    const session = {
      ...sessionFromSolanaAccounts({
        accounts: ['So11111111111111111111111111111111111111112'],
      }),
      sessionId: 'solana-session',
    };
    const signature = btoa(String.fromCharCode(...new Uint8Array(64).fill(1)));
    const response = {
      sessionId: 'solana-session',
      chainId: SOLANA,
      result: { method: 'solana_signMessage', result: { signature } },
    };
    const send = vi.fn().mockResolvedValue(response);
    const decodeResult = vi.spyOn(solanaTranslator, 'decodeResult');
    const request = {
      method: 'solana_signMessage',
      params: [{ pubkey: 'So11111111111111111111111111111111111111112' }],
    };

    await expect(
      invoke(session, { chainId: SOLANA, request }, transport(send), solanaTranslator)
    ).resolves.toEqual({ signature: new Uint8Array(64).fill(1) });
    expect(send).toHaveBeenCalledWith({
      method: 'wallet_invokeMethod',
      params: {
        sessionId: 'solana-session',
        chainId: SOLANA,
        request,
      },
    });
    // The kernel unwrapped the envelope; the namespace only saw the method result.
    expect(decodeResult).toHaveBeenCalledWith({ signature }, expect.anything());
  });
});

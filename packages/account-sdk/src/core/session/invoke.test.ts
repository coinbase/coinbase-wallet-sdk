import { Address } from ':core/type/index.js';
import { eip155Translator } from '../translators/eip155/translator.js';
import { sessionFromAccounts } from './eip155.js';
import { invoke, invokeEphemeral } from './invoke.js';
import type { Envelope, Session, Transport } from './types.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;
const OTHER = '0x0000000000000000000000000000000000000001' as Address;
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

describe('invoke', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates eip155 qualification and response unwrapping', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.sessionId = 'session-1';
    const response = {
      sessionId: 'session-1',
      chainId: 'eip155:8453',
      result: { method: 'personal_sign', result: '0xsig' },
    };
    const send = vi.fn().mockResolvedValue(response);
    const transport: Transport = { kind: 'popup', send };
    const unwrapResponse = vi.spyOn(eip155Translator, 'unwrapResponse');

    await expect(
      invoke(
        session,
        {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
        },
        transport
      )
    ).resolves.toBe('0xsig');

    expect(send).toHaveBeenCalledWith({
      sessionId: 'session-1',
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
    });
    expect(unwrapResponse).toHaveBeenCalledWith(response, {
      sessionId: 'session-1',
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
    });
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
    const unwrapResponse = vi.spyOn(eip155Translator, 'unwrapResponse');

    await expect(invokeEphemeral(envelope, { kind: 'popup', send })).resolves.toBe('0xhash');

    expect(send).toHaveBeenCalledWith(envelope);
    expect(qualify).not.toHaveBeenCalled();
    expect(unwrapResponse).toHaveBeenCalledWith(response, envelope);
  });

  it('throws an enveloped method error and preserves top-level transport errors', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const methodError = { code: 4100, message: 'method denied' };
    const methodTransport: Transport = {
      kind: 'popup',
      send: vi.fn().mockResolvedValue({
        chainId: 'eip155:8453',
        error: methodError,
      }),
    };
    await expect(
      invoke(
        session,
        {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: [] },
        },
        methodTransport
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
        { kind: 'popup', send: vi.fn().mockRejectedValue(transportError) }
      )
    ).rejects.toBe(transportError);
  });

  it('rejects a from that is not in the session', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const send = vi.fn();
    const transport: Transport = { kind: 'popup', send };

    await expect(
      invoke(
        session,
        {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x68656c6c6f', OTHER] },
        },
        transport
      )
    ).rejects.toThrow(/not in the eip155 session/);
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
        { kind: 'popup', send }
      )
    ).rejects.toThrow(/not in the session/);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects a covered non-eip155 namespace', async () => {
    const session: Session = {
      ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 }),
      scopes: {
        [SOLANA]: {
          accounts: [`${SOLANA}:So11111111111111111111111111111111111111112`],
          methods: ['solana_signMessage'],
        },
      },
    };
    const send = vi.fn();

    await expect(
      invoke(
        session,
        { chainId: SOLANA, request: { method: 'solana_signMessage', params: [] } },
        { kind: 'popup', send }
      )
    ).rejects.toThrow(/not enabled in this SDK version/);
    expect(send).not.toHaveBeenCalled();
  });
});

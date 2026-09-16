import { SOLANA_MAINNET } from './caip.js';
import type { Envelope } from ':core/session/types.js';
import { solanaTranslator } from './translator.js';

const envelope: Envelope = {
  sessionId: 'solana-session',
  chainId: SOLANA_MAINNET,
  request: { method: 'solana_signMessage', params: [{ message: 'aGVsbG8=' }] },
};
const SIGNATURE = btoa(String.fromCharCode(...new Uint8Array(64).fill(1)));
const PUBLIC_KEY = 'So11111111111111111111111111111111111111112';

describe('solanaTranslator', () => {
  it('validates and unwraps an exact CAIP-27 response', () => {
    expect(
      solanaTranslator.unwrapResponse(
        {
          sessionId: 'solana-session',
          chainId: SOLANA_MAINNET,
          result: { method: 'solana_signMessage', result: { signature: SIGNATURE } },
        },
        envelope
      )
    ).toEqual({ signature: new Uint8Array(64).fill(1) });
  });

  it('unwraps ordered batch settlement results', () => {
    const batchEnvelope: Envelope = {
      sessionId: 'solana-session',
      chainId: SOLANA_MAINNET,
      request: {
        method: 'solana_signAndSendAllTransactions',
        params: { inputs: [{ pubkey: PUBLIC_KEY, transaction: 'AQ==' }] },
      },
    };
    expect(
      solanaTranslator.unwrapResponse(
        {
          sessionId: 'solana-session',
          chainId: SOLANA_MAINNET,
          result: {
            method: 'solana_signAndSendAllTransactions',
            result: [
              { status: 'fulfilled', value: { signature: SIGNATURE } },
              { status: 'rejected', reason: { code: 4001, message: 'rejected' } },
            ],
          },
        },
        batchEnvelope
      )
    ).toEqual([
      { status: 'fulfilled', value: { signature: new Uint8Array(64).fill(1) } },
      { status: 'rejected', reason: { code: 4001, message: 'rejected' } },
    ]);
  });

  it('rejects a response for a different exact chain', () => {
    expect(() =>
      solanaTranslator.unwrapResponse(
        {
          sessionId: 'solana-session',
          chainId: 'solana:devnet',
          result: { method: 'solana_signMessage', result: { signature: SIGNATURE } },
        },
        envelope
      )
    ).toThrow(/chainId does not match/);
  });

  it('throws a method-level CAIP-27 error unchanged', () => {
    const error = { code: 4100, message: 'Solana account denied' };
    expect.assertions(1);
    try {
      solanaTranslator.unwrapResponse(
        {
          sessionId: 'solana-session',
          chainId: SOLANA_MAINNET,
          error,
        },
        envelope
      );
    } catch (caught) {
      expect(caught).toEqual(error);
    }
  });
});

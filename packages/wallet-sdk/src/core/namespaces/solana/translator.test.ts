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

/**
 * The kernel validates and unwraps the CAIP-27 envelope (see caip27.test.ts); this
 * translator only decodes the method result Solana returns inside it.
 */
describe('solanaTranslator.decodeResult', () => {
  it('decodes an encoded signature', () => {
    expect(solanaTranslator.decodeResult({ signature: SIGNATURE }, envelope)).toEqual({
      signature: new Uint8Array(64).fill(1),
    });
  });

  it('decodes ordered batch settlement results', () => {
    const batchEnvelope: Envelope = {
      sessionId: 'solana-session',
      chainId: SOLANA_MAINNET,
      request: {
        method: 'solana_signAndSendAllTransactions',
        params: { inputs: [{ pubkey: PUBLIC_KEY, transaction: 'AQ==' }] },
      },
    };
    expect(
      solanaTranslator.decodeResult(
        [
          { status: 'fulfilled', value: { signature: SIGNATURE } },
          { status: 'rejected', reason: { code: 4001, message: 'rejected' } },
        ],
        batchEnvelope
      )
    ).toEqual([
      { status: 'fulfilled', value: { signature: new Uint8Array(64).fill(1) } },
      { status: 'rejected', reason: { code: 4001, message: 'rejected' } },
    ]);
  });

  it('passes the prepared calls result through unchanged', () => {
    const result = { opaque: 'wallet result' };
    const preparedEnvelope: Envelope = {
      sessionId: 'solana-session',
      chainId: SOLANA_MAINNET,
      request: {
        method: 'coinbase_signPreparedCalls',
        params: [{ opaque: 'params' }],
      },
    };

    expect(solanaTranslator.decodeResult(result, preparedEnvelope)).toBe(result);
  });

  it('refuses to decode for a chain outside Solana mainnet', () => {
    expect(() =>
      solanaTranslator.decodeResult(
        { signature: SIGNATURE },
        { ...envelope, chainId: 'solana:devnet' }
      )
    ).toThrow(/does not support/);
  });

  it('refuses to decode an unsupported Solana method', () => {
    expect(() =>
      solanaTranslator.decodeResult(
        { signature: SIGNATURE },
        { ...envelope, request: { method: 'solana_unknown', params: [] } }
      )
    ).toThrow(/Unsupported Solana method/);
  });
});

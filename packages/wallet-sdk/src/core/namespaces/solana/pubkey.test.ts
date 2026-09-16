import { extractPubkeys } from './pubkey.js';

const PUBLIC_KEY = 'So11111111111111111111111111111111111111112';
const OTHER_KEY = '11111111111111111111111111111111';

describe('extractPubkeys', () => {
  it('reads named and positional Solana request params', () => {
    expect(
      extractPubkeys({
        method: 'solana_signMessage',
        params: { pubkey: PUBLIC_KEY, message: 'aGVsbG8=' },
      })
    ).toEqual([PUBLIC_KEY]);
    expect(
      extractPubkeys({
        method: 'solana_signTransaction',
        params: [{ pubkey: PUBLIC_KEY, transaction: 'AQ==' }],
      })
    ).toEqual([PUBLIC_KEY]);
  });

  it('reads every batch signer', () => {
    expect(
      extractPubkeys({
        method: 'solana_signAndSendAllTransactions',
        params: {
          inputs: [
            { pubkey: PUBLIC_KEY, transaction: 'AQ==' },
            { pubkey: OTHER_KEY, transaction: 'Ag==' },
          ],
        },
      })
    ).toEqual([PUBLIC_KEY, OTHER_KEY]);
  });

  it('returns no signers when they are omitted from a single request', () => {
    expect(
      extractPubkeys({ method: 'solana_signMessage', params: [{ message: 'aGVsbG8=' }] })
    ).toEqual([]);
    expect(extractPubkeys({ method: 'solana_signMessage', params: [] })).toEqual([]);
  });

  it.each([123, '0OIl-not-base58', '1111111111111111111111111111111'])(
    'rejects invalid pubkey %s',
    (pubkey) => {
      expect(() => extractPubkeys({ method: 'solana_signMessage', params: [{ pubkey }] })).toThrow(
        /base58-encoded 32-byte public key/
      );
    }
  );

  it('rejects an empty or malformed signer batch', () => {
    expect(() =>
      extractPubkeys({
        method: 'solana_signAndSendAllTransactions',
        params: { inputs: [] },
      })
    ).toThrow(/must not be empty/);
    expect(() =>
      extractPubkeys({
        method: 'solana_signAndSendAllTransactions',
        params: { inputs: [{ transaction: 'AQ==' }] },
      })
    ).toThrow(/inputs\[0\]\.pubkey/);
  });
});

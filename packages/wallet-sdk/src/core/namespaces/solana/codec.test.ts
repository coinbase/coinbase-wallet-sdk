import { decodeSolanaResult, encodeSolanaRequest } from './codec.js';

describe('Solana CAIP codec', () => {
  it('encodes byte requests as base64 JSON params', () => {
    expect(
      encodeSolanaRequest({
        method: 'solana_signMessage',
        params: { pubkey: 'pubkey', message: new Uint8Array([1, 2]) },
      })
    ).toEqual({
      method: 'solana_signMessage',
      params: { pubkey: 'pubkey', message: 'AQI=' },
    });
    expect(
      encodeSolanaRequest({
        method: 'solana_signTransaction',
        params: {
          pubkey: 'pubkey',
          transaction: new Uint8Array([3, 4]),
          options: { minContextSlot: 10 },
        },
      })
    ).toEqual({
      method: 'solana_signTransaction',
      params: { pubkey: 'pubkey', transaction: 'AwQ=', options: { minContextSlot: 10 } },
    });
    expect(
      encodeSolanaRequest({
        method: 'solana_signAndSendTransaction',
        params: {
          pubkey: 'pubkey',
          transaction: new Uint8Array([5, 6]),
          options: { skipPreflight: true },
        },
      })
    ).toEqual({
      method: 'solana_signAndSendTransaction',
      params: {
        pubkey: 'pubkey',
        transaction: 'BQY=',
        options: { skipPreflight: true },
      },
    });
    expect(
      encodeSolanaRequest({
        method: 'solana_signAndSendAllTransactions',
        params: {
          inputs: [
            { pubkey: 'first', transaction: new Uint8Array([7]) },
            {
              pubkey: 'second',
              transaction: new Uint8Array([8]),
              options: { commitment: 'confirmed' },
            },
          ],
          options: { mode: 'parallel' },
        },
      })
    ).toEqual({
      method: 'solana_signAndSendAllTransactions',
      params: {
        inputs: [
          { pubkey: 'first', transaction: 'Bw==' },
          { pubkey: 'second', transaction: 'CA==', options: { commitment: 'confirmed' } },
        ],
        options: { mode: 'parallel' },
      },
    });
  });

  it('decodes message and transaction results into bytes', () => {
    expect(
      decodeSolanaResult('solana_signMessage', {
        signature: btoa(String.fromCharCode(...new Uint8Array(64).fill(1))),
        signedMessage: 'AgM=',
      })
    ).toEqual({
      signature: new Uint8Array(64).fill(1),
      signedMessage: new Uint8Array([2, 3]),
    });
    expect(
      decodeSolanaResult('solana_signTransaction', {
        signedTransaction: 'BAU=',
      })
    ).toEqual({ signedTransaction: new Uint8Array([4, 5]) });
    const signature = btoa(String.fromCharCode(...new Uint8Array(64).fill(9)));
    expect(decodeSolanaResult('solana_signAndSendTransaction', { signature })).toEqual({
      signature: new Uint8Array(64).fill(9),
    });
    expect(
      decodeSolanaResult('solana_signAndSendAllTransactions', [
        { status: 'fulfilled', value: { signature } },
        { status: 'rejected', reason: { code: 4001, message: 'rejected' } },
      ])
    ).toEqual([
      { status: 'fulfilled', value: { signature: new Uint8Array(64).fill(9) } },
      { status: 'rejected', reason: { code: 4001, message: 'rejected' } },
    ]);
  });

  it('passes prepared calls params through unchanged', () => {
    const params = [{ opaque: 'params' }];
    expect(encodeSolanaRequest({ method: 'coinbase_signPreparedCalls', params })).toEqual({
      method: 'coinbase_signPreparedCalls',
      params,
    });
  });
  it('rejects malformed or method-mismatched results', () => {
    expect(() =>
      encodeSolanaRequest({
        method: 'solana_signMessage',
        params: { pubkey: 'pubkey', message: 'not bytes' as never },
      })
    ).toThrowError(expect.objectContaining({ code: -32602 }));
    expect(() => decodeSolanaResult('solana_signMessage', { signature: 'AQ==' })).toThrow(
      /64 bytes/
    );
    expect(() => decodeSolanaResult('solana_signMessage', { signature: 'not base64!' })).toThrow(
      /valid base64/
    );
    expect(() =>
      decodeSolanaResult('solana_signTransaction', { signedTransaction: 'AA==' })
    ).not.toThrow();
    expect(() => decodeSolanaResult('solana_signTransaction', { signedTransaction: '' })).toThrow(
      /base64 string/
    );
    expect(() =>
      decodeSolanaResult('solana_signAndSendTransaction', { signature: 'AQ==' })
    ).toThrow(/64 bytes/);
    expect(() =>
      decodeSolanaResult('solana_signAndSendAllTransactions', [
        { status: 'fulfilled', value: { signature: 'AQ==' } },
      ])
    ).toThrow(/64 bytes/);
    expect(() =>
      decodeSolanaResult('solana_signAndSendAllTransactions', [{ status: 'pending' }])
    ).toThrow(/fulfilled or rejected/);
    expect(() => decodeSolanaResult('unknown', {})).toThrowError(
      expect.objectContaining({ code: 4200 })
    );
  });
});

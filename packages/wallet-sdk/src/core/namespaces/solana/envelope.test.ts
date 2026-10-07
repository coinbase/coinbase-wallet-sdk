import { SOLANA_MAINNET } from './caip.js';
import { sessionFromSolanaAccounts } from './session.js';
import { qualify, toEnvelope } from './envelope.js';

const PUBLIC_KEY = 'So11111111111111111111111111111111111111112';
const OTHER_PUBLIC_KEY = '11111111111111111111111111111111';

describe('Solana envelope', () => {
  const session = sessionFromSolanaAccounts({ accounts: [PUBLIC_KEY] });

  it('maps Wallet Standard mainnet into an exact CAIP-27 envelope', () => {
    expect(
      toEnvelope({
        method: 'solana_signMessage',
        params: { pubkey: PUBLIC_KEY, message: new TextEncoder().encode('hello') },
      })
    ).toEqual({
      chainId: SOLANA_MAINNET,
      request: {
        method: 'solana_signMessage',
        params: { pubkey: PUBLIC_KEY, message: 'aGVsbG8=' },
      },
    });
  });

  it('requires an explicit authorized public key', () => {
    const missingAccount = {
      chainId: SOLANA_MAINNET,
      request: { method: 'solana_signMessage', params: [{ message: 'aGVsbG8=' }] },
    } as const;
    const explicit = {
      chainId: SOLANA_MAINNET,
      request: {
        method: 'solana_signTransaction',
        params: [{ pubkey: PUBLIC_KEY, transaction: 'AQ==' }],
      },
    } as const;

    expect(() => qualify(session, missingAccount)).toThrow(/must identify an account/);
    expect(qualify(session, explicit)).toBe(explicit);
  });

  it('requires the public key on the exact Solana scope', () => {
    expect(() =>
      qualify(session, {
        chainId: SOLANA_MAINNET,
        request: {
          method: 'solana_signMessage',
          params: [{ pubkey: OTHER_PUBLIC_KEY, message: 'aGVsbG8=' }],
        },
      })
    ).toThrow(/not in the Solana session scope/);
  });

  it('requires every batch signer on the exact Solana scope', () => {
    const batchSession = sessionFromSolanaAccounts({
      accounts: [PUBLIC_KEY, OTHER_PUBLIC_KEY],
    });
    const envelope = toEnvelope({
      method: 'solana_signAndSendAllTransactions',
      params: {
        inputs: [
          { pubkey: PUBLIC_KEY, transaction: new Uint8Array([1]) },
          { pubkey: OTHER_PUBLIC_KEY, transaction: new Uint8Array([2]) },
        ],
        options: { mode: 'serial' },
      },
    });

    expect(qualify(batchSession, envelope)).toBe(envelope);
    expect(() => qualify(session, envelope)).toThrow(/not in the Solana session scope/);
  });

  it('rejects unsupported chains and methods before transport', () => {
    expect(() =>
      toEnvelope(
        {
          method: 'solana_signMessage',
          params: { pubkey: PUBLIC_KEY, message: new Uint8Array([1]) },
        },
        'solana:devnet'
      )
    ).toThrowError(expect.objectContaining({ code: 4902 }));
    expect(() => toEnvelope({ method: 'solana_unknown', params: [] } as never)).toThrowError(
      expect.objectContaining({ code: 4200 })
    );
  });
});

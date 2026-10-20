import * as Base58 from 'ox/Base58';
import { SOLANA_MAINNET, SOLANA_NAMESPACE } from './caip.js';
import { SOLANA_METHODS } from './methods.js';
import { sessionFromSolanaAccounts } from './session.fixtures.js';
import {
  SOLANA_MAINNET_REQUIRED_SCOPES,
  createSolanaMainnetScopes,
  isSolanaPublicKey,
  projectSolanaAccounts,
} from './session.js';

const PUBLIC_KEY = 'So11111111111111111111111111111111111111112';
const OTHER_PUBLIC_KEY = '11111111111111111111111111111111';

describe('Solana session helpers', () => {
  it('validates the decoded 32-byte public key rather than base58 syntax alone', () => {
    expect(isSolanaPublicKey(PUBLIC_KEY)).toBe(true);
    expect(isSolanaPublicKey(OTHER_PUBLIC_KEY)).toBe(true);
    expect(isSolanaPublicKey('1111111111111111111111111111111')).toBe(false);
    expect(isSolanaPublicKey('0OIl11111111111111111111111111111111')).toBe(false);
    for (const byteLength of [31, 32, 33]) {
      const encoded = Base58.fromBytes(new Uint8Array(byteLength).fill(7));
      expect(isSolanaPublicKey(encoded), `${byteLength} decoded bytes`).toBe(byteLength === 32);
    }
  });

  it('defines the pairing scope and exact authorization requirement', () => {
    // Requested, but optional: wallets grant it only to first-party apps.
    expect(SOLANA_METHODS).toContain('coinbase_signPreparedCalls');
    expect(SOLANA_MAINNET_REQUIRED_SCOPES).toEqual([
      {
        chainId: SOLANA_MAINNET,
        methods: [
          'solana_signMessage',
          'solana_signTransaction',
          'solana_signAndSendTransaction',
          'solana_signAndSendAllTransactions',
        ],
      },
    ]);
    // Pairing asks for the bare namespace: authorization is per namespace, and every
    // Solana envelope is built for mainnet.
    expect(createSolanaMainnetScopes()).toEqual({
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
    });
  });

  it('projects every granted account in wallet order and removes duplicates', () => {
    const session = sessionFromSolanaAccounts({
      accounts: [PUBLIC_KEY, OTHER_PUBLIC_KEY, PUBLIC_KEY],
    });

    expect(projectSolanaAccounts(session)).toEqual([PUBLIC_KEY, OTHER_PUBLIC_KEY]);
    expect(session).not.toHaveProperty('selected');
  });
});

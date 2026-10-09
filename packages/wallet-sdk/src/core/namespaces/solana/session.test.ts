import * as Base58 from 'ox/Base58';
import { SOLANA_MAINNET, SOLANA_NAMESPACE, SOLANA_WALLET_STANDARD_MAINNET } from './caip.js';
import { SOLANA_METHODS } from './methods.js';
import {
  SOLANA_MAINNET_REQUIRED_SCOPES,
  createSolanaMainnetScopes,
  formatSolanaAccount,
  isSolanaPublicKey,
  projectSolanaAccounts,
  sessionFromSolanaAccounts,
  solanaChainId,
  solanaWalletStandardChain,
} from './session.js';

const PUBLIC_KEY = 'So11111111111111111111111111111111111111112';
const OTHER_PUBLIC_KEY = '11111111111111111111111111111111';

describe('Solana session helpers', () => {
  it('maps Wallet Standard mainnet to exact CAIP-2 and CAIP-10', () => {
    expect(solanaChainId(SOLANA_WALLET_STANDARD_MAINNET)).toBe(SOLANA_MAINNET);
    expect(solanaChainId(SOLANA_MAINNET)).toBe(SOLANA_MAINNET);
    expect(solanaWalletStandardChain(SOLANA_MAINNET)).toBe(SOLANA_WALLET_STANDARD_MAINNET);
    expect(formatSolanaAccount(PUBLIC_KEY)).toBe(`${SOLANA_MAINNET}:${PUBLIC_KEY}`);
  });

  it('validates the decoded 32-byte public key rather than base58 syntax alone', () => {
    expect(isSolanaPublicKey(PUBLIC_KEY)).toBe(true);
    expect(isSolanaPublicKey(OTHER_PUBLIC_KEY)).toBe(true);
    expect(isSolanaPublicKey('1111111111111111111111111111111')).toBe(false);
    expect(isSolanaPublicKey('0OIl11111111111111111111111111111111')).toBe(false);
    expect(() => formatSolanaAccount('not-a-public-key')).toThrow(/32-byte public key/);
    for (const byteLength of [31, 32, 33]) {
      const encoded = Base58.fromBytes(new Uint8Array(byteLength).fill(7));
      expect(isSolanaPublicKey(encoded), `${byteLength} decoded bytes`).toBe(byteLength === 32);
    }
  });

  it('defines the pairing scope and exact authorization requirement', () => {
    expect(SOLANA_MAINNET_REQUIRED_SCOPES).toEqual([
      { chainId: SOLANA_MAINNET, methods: SOLANA_METHODS },
    ]);
    // Pairing asks for the bare namespace: authorization is per namespace, and the
    // only supported cluster is enforced by `solanaChainId` / `assertSolanaEnvelope`.
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

  it('carries requested connection capabilities on the Solana scope', () => {
    // The wallet fulfills these at approval time, such as signing an AOS challenge.
    expect(createSolanaMainnetScopes({ capabilities: { aos: { nonce: 'solana-nonce' } } })).toEqual(
      {
        [SOLANA_NAMESPACE]: {
          methods: [
            'solana_signMessage',
            'solana_signTransaction',
            'solana_signAndSendTransaction',
            'solana_signAndSendAllTransactions',
            'coinbase_signPreparedCalls',
          ],
          notifications: [],
          capabilities: { aos: { nonce: 'solana-nonce' } },
        },
      }
    );
  });

  it('projects every granted account in wallet order and removes duplicates', () => {
    const session = sessionFromSolanaAccounts({
      accounts: [PUBLIC_KEY, OTHER_PUBLIC_KEY, PUBLIC_KEY],
    });

    expect(projectSolanaAccounts(session)).toEqual([PUBLIC_KEY, OTHER_PUBLIC_KEY]);
    expect(session).not.toHaveProperty('selected');
  });

  it('rejects unsupported Solana clusters with standardized errors', () => {
    expect(() => solanaChainId('solana:devnet')).toThrowError(
      expect.objectContaining({ code: 4902 })
    );
    expect(() => solanaWalletStandardChain('solana:devnet')).toThrowError(
      expect.objectContaining({ code: 4902 })
    );
  });
});

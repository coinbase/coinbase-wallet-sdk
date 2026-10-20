import type { Session } from ':core/session/types.js';
import { SOLANA_NAMESPACE } from './caip.js';
import { SOLANA_METHODS } from './methods.js';

/**
 * Build a Solana-only session from raw public keys.
 *
 * Test-only: the real thing comes from `sessionFromCaip25Result`. Excluded from the build
 * in `tsconfig.build.json`.
 */
export function sessionFromSolanaAccounts(opts: { accounts: string[] }): Session {
  return {
    namespaces: {
      [SOLANA_NAMESPACE]: { accounts: [...opts.accounts], methods: [...SOLANA_METHODS] },
    },
  };
}

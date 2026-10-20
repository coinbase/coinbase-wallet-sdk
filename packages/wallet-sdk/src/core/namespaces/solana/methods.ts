/**
 * Requested, but a session without them still counts as connected: the wallet grants them only
 * to first-party apps. Calling one the session did not grant is unauthorized.
 */
export const SOLANA_OPTIONAL_METHODS: readonly string[] = ['coinbase_signPreparedCalls'];

/** CAIP-27 methods requested for the initial Solana mainnet session. */
export const SOLANA_METHODS: readonly string[] = [
  'solana_signMessage',
  'solana_signTransaction',
  'solana_signAndSendTransaction',
  'solana_signAndSendAllTransactions',
  ...SOLANA_OPTIONAL_METHODS,
];

/** CAIP-27 methods requested for the initial Solana mainnet session. */
export const SOLANA_METHODS = [
  'solana_signMessage',
  'solana_signTransaction',
  'solana_signAndSendTransaction',
  'solana_signAndSendAllTransactions',
  'coinbase_signPreparedCalls',
] as const;

/** Solana methods routed through the wallet transport. */
export const SOLANA_WALLET_METHODS = new Set<string>(SOLANA_METHODS);

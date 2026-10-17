import type { Caip2 } from ':core/session/caip.js';

/** CAIP-104 namespace identifier: the scope key and the storage key for Solana. */
export const SOLANA_NAMESPACE = 'solana';
export const SOLANA_MAINNET_REFERENCE = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
export const SOLANA_MAINNET = `solana:${SOLANA_MAINNET_REFERENCE}` as const satisfies Caip2;
/** Wallet Standard cluster name corresponding to the CAIP-2 Solana mainnet id. */
export const SOLANA_WALLET_STANDARD_MAINNET = 'solana:mainnet' as const;

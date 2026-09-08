import type { Caip2 } from ':core/session/caip.js';

export const SOLANA_MAINNET_REFERENCE = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
export const SOLANA_MAINNET = `solana:${SOLANA_MAINNET_REFERENCE}` as const satisfies Caip2;
/** Wallet Standard cluster name corresponding to the CAIP-2 Solana mainnet id. */
export const SOLANA_WALLET_STANDARD_MAINNET = 'solana:mainnet' as const;

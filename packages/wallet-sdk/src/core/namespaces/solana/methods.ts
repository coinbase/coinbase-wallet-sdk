import { SOLANA_METHODS } from './session.js';

/** Solana methods routed through the wallet transport. */
export const SOLANA_WALLET_METHODS = new Set<string>(SOLANA_METHODS);

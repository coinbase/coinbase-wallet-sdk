/**
 * eip155 translator: EIP-1193 ↔ CAIP-27 Envelope.
 *
 * `toEnvelope` — 1193 `{ method, params }` + chain id → `{ chainId, request }`.
 * `qualify` — signer in `request.params` must be in the session (`invoke`).
 * `eip155Translator` — registered request qualification + response unwrapping.
 *
 * Solana is `translators/solana`, not a second Signer.
 */
export { qualify, toEnvelope } from './envelope.js';
export { extractFrom } from './from.js';
export { WALLET_METHODS } from './methods.js';
export { eip155Translator } from './translator.js';

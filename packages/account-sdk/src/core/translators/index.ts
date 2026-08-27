/**
 * Family RPC ↔ Envelope translators.
 *
 * `toEnvelope` wraps a chain-standard request as `{ chainId, request }`.
 * `wallet_invokeMethod` is the JSON-RPC carrier on the wire (transport, keys v2),
 * not a rename inside these folders.
 *
 * `eip155/` is live. `solana/` is the sibling slot.
 */
export {
  WALLET_METHODS,
  extractFrom,
  qualify,
  toEnvelope,
} from './eip155/index.js';

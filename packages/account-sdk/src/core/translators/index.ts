/**
 * Family RPC ↔ CAIP-27 Envelope (diagram: Translators).
 *
 * `toEnvelope` wraps a chain-standard request as `{ chainId, request }`.
 * `wallet_invokeMethod` is the JSON-RPC carrier on the wire (transport, keys v2),
 * not a rename inside these folders.
 *
 * `eip155/` is live. `solana/` is the sibling slot.
 */
export {
  WALLET_METHODS,
  eip155Translator,
  extractFrom,
  qualify,
  toEnvelope,
  toLegacyRequest,
} from './eip155/index.js';
export { getNamespaceTranslator } from './registry.js';
export type { NamespaceTranslator, SupportedNamespace } from './types.js';

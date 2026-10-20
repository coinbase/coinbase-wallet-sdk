import type { Caip27Params } from ':core/rpc/wallet_invokeMethod.js';
import type { Caip2, Session } from '../../storage/schema.js';
export type { ChainMetadata, NamespaceGrant, Session } from '../../storage/schema.js';

/**
 * Kernel request after the namespace adapter has run.
 *
 * Same shape as CAIP-27 params. Namespace-specific fields stay inside
 * `request.params`; the injected namespace translator interprets them.
 */
export type Envelope = Caip27Params;

/** One chain a caller needs, optionally with the methods it needs on that chain. */
export type ScopeRequirement =
  | Caip2
  | {
      chainId: Caip2;
      methods?: readonly string[];
    };

/**
 * Namespace-owned policy injected into the chain-neutral invoke kernel.
 *
 * The kernel already validates and unwraps the CAIP-27 envelope. `decodeResult` is only
 * for namespaces whose method results are not JSON-native (Solana bytes); eip155 has
 * nothing to add and supplies `qualify` alone.
 */
export type NamespaceTranslator = {
  qualify(session: Session, envelope: Envelope): Envelope;
  decodeResult?(result: unknown, envelope: Envelope): unknown;
};

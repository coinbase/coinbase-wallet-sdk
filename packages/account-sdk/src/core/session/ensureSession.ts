import { type ScopeRequirement, sessionCovers } from './covers.js';
import type { Session } from './types.js';

/** Outcome of `pair` / `ensureSession`: session plus an optional public projection. */
export type PairResult = {
  session: Session;
  result?: unknown;
};

/**
 * Return a session that covers `requiredScopes`, pairing only when necessary.
 *
 * Not a third kernel verb — a gate in front of `pair`:
 * - If `session` already has accounts for those CAIP-2 chains (`sessionCovers`),
 *   return it unchanged. No handshake, no popup.
 * - Otherwise call `opts.pair` (handshake + CAIP-25 `wallet_createSession`).
 *
 * Disconnected EIP-1193 uses this on `eth_requestAccounts` / `wallet_connect`.
 */
export async function ensureSession(opts: {
  session: Session | undefined;
  requiredScopes: readonly ScopeRequirement[];
  pair: () => Promise<PairResult>;
}): Promise<PairResult> {
  if (sessionCovers(opts.session, opts.requiredScopes) && opts.session) {
    return { session: opts.session };
  }
  return opts.pair();
}

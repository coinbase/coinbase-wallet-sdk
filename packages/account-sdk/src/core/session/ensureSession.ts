import type { Caip2 } from './caip.js';
import { sessionCovers } from './covers.js';
import type { Session } from './types.js';

/** Outcome of `pair` / `ensureSession`: the session plus the raw wallet result. */
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
 * - Otherwise call `opts.pair` (typically handshake + `wallet_connect`).
 *
 * Disconnected EIP-1193 uses this on `eth_requestAccounts` / `wallet_connect`.
 */
export async function ensureSession(opts: {
  session: Session | undefined;
  requiredScopes: Caip2[];
  pair: () => Promise<PairResult>;
}): Promise<PairResult> {
  if (sessionCovers(opts.session, opts.requiredScopes) && opts.session) {
    return { session: opts.session };
  }
  return opts.pair();
}

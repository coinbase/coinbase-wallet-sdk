import type { Caip2 } from './caip.js';
import { sessionCovers } from './covers.js';
import type { Session } from './types.js';

export type PairResult = {
  session: Session;
  result?: unknown;
};

/**
 * Get a session that covers `requiredScopes`, pairing only when necessary.
 *
 * If `session` already has accounts for those CAIP-2 chains, returns it unchanged
 * (no popup). Otherwise calls `pair` — typically handshake + `wallet_connect`.
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

import { type ScopeRequirement, sessionCovers } from './covers.js';
import type { Session } from './types.js';

/**
 * Return a session that covers `requiredScopes`, creating one only when necessary.
 *
 * This is a gate in front of `createSession`:
 * - If `session` already has accounts for those CAIP-2 chains (`sessionCovers`),
 *   return it unchanged. No handshake, no popup.
 * - Otherwise call `opts.createSession` (handshake + CAIP-25 `wallet_createSession`).
 */
export async function ensureSession(opts: {
  session: Session | undefined;
  requiredScopes: readonly ScopeRequirement[];
  createSession: () => Promise<Session>;
}): Promise<Session> {
  if (sessionCovers(opts.session, opts.requiredScopes) && opts.session) {
    return opts.session;
  }
  return opts.createSession();
}

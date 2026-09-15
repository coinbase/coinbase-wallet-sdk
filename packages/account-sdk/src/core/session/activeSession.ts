import { sessionCovers } from './covers.js';
import type { Session } from './types.js';

/**
 * Return a locally usable persisted session.
 *
 * This only validates cached authorization shape; the wallet may still reject a
 * stale session id, which `createSession` recovers by creating a fresh session.
 */
export function activeSession(session: Session | undefined): Session | undefined {
  return session?.sessionId && sessionCovers(session, []) ? session : undefined;
}

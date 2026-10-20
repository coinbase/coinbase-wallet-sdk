import type {
  Caip25RequestScope,
  WalletCreateSessionRequest,
} from ':core/rpc/wallet_createSession.js';
import type { WalletTransport } from ':core/transport/index.js';
import { sessionFromCaip25Result } from './caip25.js';
import { activeSession } from './grants.js';
import type { Session } from './types.js';

/**
 * Create or update a namespace-neutral session through CAIP-25 and persist its exact grants.
 *
 * A persisted session id lets the wallet keep the existing keys, so the handshake is
 * skipped. A 4100 is never retried here: the wallet answers with it both for a session id
 * it no longer holds and for an approval that granted nothing, and retrying the second
 * case re-prompts a user who just declined. It propagates instead, and every caller resets
 * on it with `transport.cleanup()`, which clears the keys and the stored session, so the
 * next connect starts clean.
 */
export async function createSession(
  transport: WalletTransport,
  scopes: Record<string, Caip25RequestScope>
): Promise<Session> {
  const sessionId = activeSession(transport.readSession())?.sessionId;
  if (!sessionId) await transport.handshake({ method: 'handshake' });

  const rawResult = await transport.request({
    method: 'wallet_createSession',
    params: { scopes, ...(sessionId ? { sessionId } : {}) },
  } satisfies WalletCreateSessionRequest);

  const session = sessionFromCaip25Result(rawResult);
  transport.writeSession(session);
  return session;
}

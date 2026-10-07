import type { WalletTransport } from ':core/transport/index.js';
import { createCaip25Request, sessionFromCaip25Result } from './caip25.js';
import { activeSession } from './grants.js';
import type { CreateSessionOptions, Session } from './types.js';

/**
 * Create or update a namespace-neutral session through CAIP-25 and persist its exact grants.
 *
 * A persisted session id lets the wallet keep the existing keys, so the handshake is
 * skipped. A 4100 is never retried here: the wallet answers with it both for a session id
 * it no longer holds and for an approval that granted nothing, and retrying the second
 * case re-prompts a user who just declined. It propagates instead, and the provider
 * resets on it — `disconnect` clears the keys and the stored session, so the next connect
 * starts clean.
 */
export async function createSession(
  transport: WalletTransport,
  options: CreateSessionOptions
): Promise<Session> {
  const persisted = activeSession(transport.readSession());
  const sessionId = options.sessionId ?? persisted?.sessionId;
  const canReusePersistedKeys = !!persisted?.sessionId && persisted.sessionId === sessionId;

  if (!canReusePersistedKeys) {
    await transport.handshake({ method: 'handshake' });
  }

  const rawResult = await transport.request(
    createCaip25Request({
      scopes: options.scopes,
      ...(sessionId ? { sessionId } : {}),
      ...(options.properties ? { properties: options.properties } : {}),
    })
  );

  const session = sessionFromCaip25Result(rawResult);
  transport.writeSession(session);
  return session;
}

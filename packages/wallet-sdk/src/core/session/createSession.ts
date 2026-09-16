import { standardErrorCodes } from ':core/error/constants.js';
import type { WalletTransport } from ':core/transport/index.js';
import { activeSession } from './activeSession.js';
import type { Caip25RequestScope } from './caip25.js';
import { createCaip25Request, sessionFromCaip25Result } from './caip25.js';
import type { Session } from './types.js';

function isUnauthorized(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    !Array.isArray(error) &&
    'code' in error &&
    error.code === standardErrorCodes.provider.unauthorized
  );
}

export type CreateSessionOptions = {
  scopes: Record<string, Caip25RequestScope>;
  sessionId?: string;
  properties?: Record<string, unknown>;
};

/**
 * Request authoritative CAIP-25 grants, retrying once without a stale session id.
 */
async function requestSession(
  transport: WalletTransport,
  options: CreateSessionOptions
): Promise<Session> {
  const persisted = activeSession(transport.readSession());
  const sessionId = options.sessionId ?? persisted?.sessionId;
  const canReusePersistedKeys = !!persisted?.sessionId && persisted.sessionId === sessionId;

  if (!canReusePersistedKeys) {
    await transport.handshake({ method: 'handshake' });
  }

  const request = createCaip25Request({
    scopes: options.scopes,
    sessionId,
    ...(options.properties ? { properties: options.properties } : {}),
  });
  let rawResult: unknown;
  try {
    rawResult = await transport.request(request);
  } catch (error) {
    if (!canReusePersistedKeys || !isUnauthorized(error)) throw error;

    await transport.handshake({ method: 'handshake' });
    rawResult = await transport.request(
      createCaip25Request({
        scopes: options.scopes,
        ...(options.properties ? { properties: options.properties } : {}),
      })
    );
  }

  const session = sessionFromCaip25Result(rawResult);
  return session;
}

/**
 * Create or update a namespace-neutral session through CAIP-25 and persist its exact grants.
 */
export async function createSession(
  transport: WalletTransport,
  options: CreateSessionOptions
): Promise<Session> {
  const session = await requestSession(transport, options);
  transport.writeSession(session);
  return session;
}

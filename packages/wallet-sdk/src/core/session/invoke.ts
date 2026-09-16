import { standardErrors } from ':core/error/errors.js';
import type { WalletTransport } from ':core/transport/index.js';
import { assertInvokeAuthorized, createCaip27Request } from './caip27.js';
import type { Envelope, NamespaceTranslator, Session } from './types.js';

/**
 * Send one request on an **already-paired** session.
 *
 * Use this after `createSession` / `ensureSession` has written a `Session`. It does not
 * open a popup, handshake, or `wallet_connect`. Flow:
 *
 * 1. CAIP-27: `chainId` must already be in the session (`assertInvokeAuthorized`).
 * 2. Apply the namespace translator supplied by the caller.
 * 3. `qualify` — validate namespace-specific session requirements.
 * 4. Add the CAIP-25 `sessionId` when one was issued.
 * 5. `transport.request(wallet_invokeMethod)` — deliver the complete CAIP-27 JSON-RPC request.
 * 6. The selected translator validates and unwraps the opaque response.
 *
 * Contrast with `createSession`, which creates the session.
 */
export async function invoke(
  session: Session,
  envelope: Envelope,
  transport: WalletTransport,
  translator: NamespaceTranslator
): Promise<unknown> {
  assertInvokeAuthorized(session, envelope);
  const qualified = translator.qualify(session, {
    ...envelope,
    ...(session.sessionId ? { sessionId: session.sessionId } : {}),
  });
  const response = await transport.request(createCaip27Request(qualified));
  return translator.unwrapResponse(response, qualified);
}

/**
 * Send one namespace envelope without a persisted session.
 *
 * The caller owns handshake and cleanup. This deliberately skips session
 * authorization and request qualification, then delegates opaque response
 * handling to the namespace translator. A session id is forbidden so this
 * path cannot bypass persisted-session authorization.
 */
export async function invokeEphemeral(
  envelope: Envelope,
  transport: WalletTransport,
  translator: NamespaceTranslator
): Promise<unknown> {
  if (envelope.sessionId !== undefined) {
    throw standardErrors.rpc.invalidParams('Ephemeral invoke cannot include a sessionId');
  }
  const response = await transport.request(createCaip27Request(envelope));
  return translator.unwrapResponse(response, envelope);
}

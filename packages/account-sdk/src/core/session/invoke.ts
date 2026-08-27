import { standardErrors } from ':core/error/errors.js';
import { getNamespaceTranslator } from '../translators/registry.js';
import { namespaceOf } from './caip.js';
import { assertInvokeAuthorized } from './caip27.js';
import type { Envelope, Session, Transport } from './types.js';

/**
 * Send one request on an **already-paired** session.
 *
 * Use this after `pair` / `ensureSession` has written a `Session`. It does not
 * open a popup, handshake, or `wallet_connect`. Flow:
 *
 * 1. CAIP-27: `chainId` must already be in the session (`assertInvokeAuthorized`).
 * 2. Select the registered namespace translator (only `eip155` today).
 * 3. `qualify` — validate namespace-specific session requirements.
 * 4. Add the CAIP-25 `sessionId` when one was issued.
 * 5. `transport.send(envelope)` — popup sends CAIP-27 `wallet_invokeMethod`.
 * 6. The selected translator validates and unwraps the opaque response.
 *
 * Contrast with `pair`, which creates the session. Funding / add-owner for a
 * sub-account still call `invoke` on the **global** account (the sub-account
 * itself is signed locally via `:owner-key`).
 */
export async function invoke(
  session: Session,
  envelope: Envelope,
  transport: Transport
): Promise<unknown> {
  assertInvokeAuthorized(session, envelope);
  // Namespace semantics, not the delivery transport, determine qualification and response decoding.
  const translator = getNamespaceTranslator(namespaceOf(envelope.chainId));
  const qualified = translator.qualify(session, {
    ...envelope,
    ...(session.sessionId ? { sessionId: session.sessionId } : {}),
  });
  const response = await transport.send(qualified);
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
export async function invokeEphemeral(envelope: Envelope, transport: Transport): Promise<unknown> {
  if (envelope.sessionId !== undefined) {
    throw standardErrors.rpc.invalidParams('Ephemeral invoke cannot include a sessionId');
  }
  const translator = getNamespaceTranslator(namespaceOf(envelope.chainId));
  const response = await transport.send(envelope);
  return translator.unwrapResponse(response, envelope);
}

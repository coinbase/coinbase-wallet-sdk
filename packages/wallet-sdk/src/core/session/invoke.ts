import { standardErrors } from ':core/error/errors.js';
import type { WalletTransport } from ':core/transport/index.js';
import { createCaip27Request, readCaip27Result } from './caip27.js';
import { assertInvokeAuthorized } from './grants.js';
import type { Envelope, NamespaceTranslator, Session } from './types.js';

/** Validate the CAIP-27 reply, then let the namespace decode a non-JSON result. */
function readResponse(
  response: unknown,
  envelope: Envelope,
  translator: NamespaceTranslator
): unknown {
  const result = readCaip27Result(response, envelope);
  return translator.decodeResult ? translator.decodeResult(result, envelope) : result;
}

/**
 * Send one request on an **already-paired** session.
 *
 * Use this after `createSession` has written a `Session`. It does not open a popup,
 * handshake, or `wallet_connect`. Flow:
 *
 * 1. CAIP-27: `chainId` and method must already be authorized (`assertInvokeAuthorized`).
 * 2. `qualify` — namespace-specific checks, such as the signer being granted.
 * 3. Add the CAIP-25 `sessionId` when one was issued.
 * 4. `transport.request(wallet_invokeMethod)`.
 * 5. Validate the reply envelope and unwrap the method result.
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
  return readResponse(response, qualified, translator);
}

/**
 * Handshake, send one namespace envelope, then clear the temporary keys.
 *
 * Owns the whole one-shot lifecycle, so no session is ever written and the keys it
 * negotiates are cleared even when the transport or response decoding fails. This
 * deliberately skips session authorization and request qualification. A session id is
 * forbidden so this path cannot bypass persisted-session authorization, and it is
 * rejected before the transport is touched.
 */
export async function invokeEphemeral(
  envelope: Envelope,
  transport: WalletTransport,
  translator: NamespaceTranslator
): Promise<unknown> {
  if (envelope.sessionId !== undefined) {
    throw standardErrors.rpc.invalidParams('Ephemeral invoke cannot include a sessionId');
  }
  try {
    await transport.handshake({ method: 'handshake' });
    const response = await transport.request(createCaip27Request(envelope));
    return readResponse(response, envelope, translator);
  } finally {
    await transport.cleanup();
  }
}

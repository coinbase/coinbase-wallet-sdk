import { standardErrorCodes } from ':core/error/constants.js';
import { logSessionCleared } from ':core/telemetry/events/session.js';
import type { WalletTransport } from ':core/transport/index.js';
import { isRecord } from ':util/guards.js';
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
 * 3. `transport.request(wallet_invokeMethod)` over the session's pairing.
 * 4. Validate the reply envelope and unwrap the method result.
 *
 * A 4100 from any of these steps clears the session (keys and stored session), so every
 * interface sees the disconnect through the session store.
 *
 * Contrast with `createSession`, which creates the session.
 */
export async function invoke(
  session: Session,
  envelope: Envelope,
  transport: WalletTransport,
  translator: NamespaceTranslator
): Promise<unknown> {
  try {
    assertInvokeAuthorized(session, envelope);
    const qualified = translator.qualify(session, envelope);
    const response = await transport.request(createCaip27Request(qualified));
    return readResponse(response, qualified, translator);
  } catch (error) {
    if (isRecord(error) && error.code === standardErrorCodes.provider.unauthorized) {
      await transport.cleanup();
      logSessionCleared({ clearReason: 'unauthorized' });
    }
    throw error;
  }
}

/**
 * Handshake, send one namespace envelope, then clear the temporary keys.
 *
 * Owns the whole one-shot lifecycle, so no session is ever written and the keys it
 * negotiates are cleared even when the transport or response decoding fails. This
 * deliberately skips session authorization and request qualification: the wallet sees a
 * pairing that only exists from this handshake and limits it to its one-shot methods.
 */
export async function invokeEphemeral(
  envelope: Envelope,
  transport: WalletTransport,
  translator: NamespaceTranslator
): Promise<unknown> {
  try {
    await transport.handshake({ method: 'handshake' });
    const response = await transport.request(createCaip27Request(envelope));
    return readResponse(response, envelope, translator);
  } finally {
    await transport.cleanup();
  }
}

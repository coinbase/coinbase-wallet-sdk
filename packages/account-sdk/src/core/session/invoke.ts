import { standardErrors } from ':core/error/errors.js';
import { qualify } from '../translators/eip155/index.js';
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
 * 2. Reject namespaces this SDK version does not enable (only `eip155` today).
 * 3. `qualify` — eip155 signer from `request.params` (or selected account);
 *    reject if that account is not in the session.
 * 4. `transport.send(envelope)` — popup strips to `{ method, params }` and
 *    encrypts v1 RPC; WalletLink 2.0 will send on a relay instead.
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
  const ns = namespaceOf(envelope.chainId);
  if (ns !== 'eip155') {
    throw standardErrors.provider.unsupportedMethod(
      `Namespace '${ns}' is not enabled in this SDK version`
    );
  }
  return transport.send(qualify(session, envelope));
}

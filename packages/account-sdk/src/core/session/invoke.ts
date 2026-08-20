import { standardErrors } from ':core/error/errors.js';
import { localize } from '../namespaces/eip155/index.js';
import { namespaceOf } from './caip.js';
import type { Caip27Envelope, Channel, SessionData } from './types.js';

/**
 * Send one CAIP-27 envelope on an already-paired session.
 *
 * Does not open a new pairing. Requires `from` to already be in the session
 * (`localize` fills it from the selected eip155 account when omitted).
 * Only the eip155 namespace is enabled in this SDK version.
 */
export async function invoke(
  session: SessionData,
  envelope: Caip27Envelope,
  channel: Channel
): Promise<unknown> {
  const ns = namespaceOf(envelope.chainId);
  if (ns !== 'eip155') {
    throw standardErrors.provider.unsupportedMethod(
      `Namespace '${ns}' is not enabled in this SDK version`
    );
  }
  return channel.send(localize(session, envelope));
}

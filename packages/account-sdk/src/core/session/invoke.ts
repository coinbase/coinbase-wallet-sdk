import { standardErrors } from ':core/error/errors.js';
import { qualify } from '../namespaces/eip155/index.js';
import { namespaceOf } from './caip.js';
import type { Envelope, Session, Transport } from './types.js';

/**
 * Send one envelope on an already-paired session.
 *
 * Does not open a new pairing. Requires `from` to already be in the session
 * (`qualify` fills it from the selected eip155 account when omitted).
 * Only the eip155 namespace is enabled in this SDK version.
 */
export async function invoke(
  session: Session,
  envelope: Envelope,
  transport: Transport
): Promise<unknown> {
  const ns = namespaceOf(envelope.chainId);
  if (ns !== 'eip155') {
    throw standardErrors.provider.unsupportedMethod(
      `Namespace '${ns}' is not enabled in this SDK version`
    );
  }
  return transport.send(qualify(session, envelope));
}

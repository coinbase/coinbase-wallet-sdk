import type { Envelope, Session } from '../session/types.js';

/** Namespace families recognized by the internal translator registry. */
export type SupportedNamespace = 'eip155' | 'solana' | 'bip122';

/** Internal adapter that qualifies and unwraps envelopes for one namespace. */
export type NamespaceTranslator<TNamespace extends SupportedNamespace = SupportedNamespace> = {
  readonly namespace: TNamespace;
  qualify(session: Session, envelope: Envelope): Envelope;
  unwrapResponse(response: unknown, envelope: Envelope): unknown;
};

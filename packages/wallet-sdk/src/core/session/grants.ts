import { standardErrors } from ':core/error/errors.js';
import { type Caip2, type Namespace, namespaceOf } from './caip.js';
import type { Envelope, ScopeRequirement, ScopeState, Session } from './types.js';

/**
 * The persisted session, or `undefined` when it is not usable.
 *
 * Usable means the wallet issued a session id and at least one scope still carries an
 * account. This only validates cached authorization shape; the wallet may still reject a
 * stale session id, which `createSession` recovers by creating a fresh session.
 */
export function activeSession(session: Session | undefined): Session | undefined {
  if (!session?.sessionId) return undefined;
  const hasAccount = Object.values(session.namespaces).some((grant) => grant.accounts.length > 0);
  return hasAccount ? session : undefined;
}

/**
 * The grant covering one namespace, or `undefined` when nothing is authorized there.
 *
 * A grant with no accounts is not a connection: the wallet can revoke every account and
 * leave the scope behind.
 */
export function activeGrantForNamespace(
  session: Session,
  namespace: Namespace
): ScopeState | undefined {
  const grant = session.namespaces[namespace];
  return grant?.accounts.length ? grant : undefined;
}

/**
 * The grant that authorizes one CAIP-2 chain, or `undefined` when nothing does.
 *
 * Authorization is per namespace, so every chain in a namespace resolves to the same
 * grant. Whether the wallet can actually serve that chain is a separate question,
 * answered by its chain catalog, and its own error if the answer is no.
 */
export function activeGrantForChain(session: Session, chainId: Caip2): ScopeState | undefined {
  return activeGrantForNamespace(session, namespaceOf(chainId));
}

/**
 * The session must cover this chain, and the envelope must belong to this session.
 *
 * Method support is deliberately not checked. The SDK asks for the methods it knows about
 * at connect time, so a method missing from the grant means either the wallet abbreviated
 * its answer or the method is newer than the request — both the wallet's call to make, and
 * it answers with a method-level error. Rejecting here would turn "this wallet build does
 * not do that" into an authorization failure, which the provider treats as a disconnect.
 */
export function assertInvokeAuthorized(session: Session, envelope: Envelope): void {
  if (!activeGrantForChain(session, envelope.chainId)) {
    throw standardErrors.provider.unauthorized(`chainId ${envelope.chainId} is not in the session`);
  }
  if (envelope.sessionId !== undefined && envelope.sessionId !== session.sessionId) {
    throw standardErrors.provider.unauthorized('sessionId does not match the active session');
  }
}

/**
 * True when the session has accounts and all requested methods on every required chain.
 *
 * Used to decide whether a `createSession` round trip can be skipped. Authorization is
 * per namespace, so a chain is covered by the grant on its namespace.
 */
export function sessionCovers(
  session: Session | undefined,
  required: readonly ScopeRequirement[]
): boolean {
  if (!session) return false;
  return required.every((requirement) => {
    const chainId = typeof requirement === 'string' ? requirement : requirement.chainId;
    const methods = typeof requirement === 'string' ? [] : (requirement.methods ?? []);
    const scope = activeGrantForChain(session, chainId);
    if (!scope) return false;
    return methods.every((method) => scope.methods.includes(method));
  });
}

import { type Caip2, type Namespace, accountOf } from './caip.js';
import type { ScopeState, Session } from './types.js';

/**
 * Namespace of a `Session.scopes` key.
 *
 * Keys are either an exact CAIP-2 chain (`eip155:8453`) or a bare namespace (`eip155`).
 */
export function scopeNamespace(scopeKey: string): Namespace {
  const separator = scopeKey.indexOf(':');
  return separator === -1 ? scopeKey : scopeKey.slice(0, separator);
}

/**
 * The grant that authorizes one CAIP-2 chain, or `undefined` when nothing does.
 *
 * A namespace key (`eip155`) is the normal shape: connection consent is granted per
 * account, not per chain, and the wallet decides at execution time which chains it
 * supports. Exact chain keys (`eip155:8453`) stay authoritative and narrow, so a dapp
 * that wants a single-chain session — or an older wallet that only grants one chain at
 * a time — keeps working unchanged.
 */
export function grantFor(session: Session, chainId: Caip2): ScopeState | undefined {
  const exact = session.scopes[chainId];
  if (exact?.accounts.length) return exact;
  const namespaceGrant = session.scopes[scopeNamespace(chainId)];
  return namespaceGrant?.accounts.length ? namespaceGrant : undefined;
}

/**
 * Raw accounts authorized on one chain, in wallet order.
 *
 * Chain-keyed grants store CAIP-10 ids; namespace grants store raw accounts, because
 * there is no single chain to qualify them with. `accountOf` normalizes both.
 */
export function accountsFor(session: Session, chainId: Caip2): string[] {
  return (grantFor(session, chainId)?.accounts ?? []).map(accountOf);
}

/** Every grant in one namespace, in session order, with its scope key. */
export function grantsInNamespace(
  session: Session,
  namespace: Namespace
): [scopeKey: string, scope: ScopeState][] {
  return Object.entries(session.scopes).filter(([key]) => scopeNamespace(key) === namespace);
}

/** True when any grant in the namespace carries at least one account. */
export function hasNamespaceGrant(session: Session, namespace: Namespace): boolean {
  return grantsInNamespace(session, namespace).some(([, scope]) => scope.accounts.length > 0);
}

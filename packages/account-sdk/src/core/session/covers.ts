import type { Caip2 } from './caip.js';
import type { Session } from './types.js';

export type ScopeRequirement =
  | Caip2
  | {
      chainId: Caip2;
      methods?: readonly string[];
    };

/**
 * True when the session has accounts and all requested methods on every exact
 * CAIP-2 chain.
 *
 * Used by `ensureSession` to skip `pair`. Empty `required` means “any account
 * on any chain is enough.”
 *
 * CAIP-25 grants are never inferred across chains, even when eip155 addresses
 * happen to be identical.
 */
export function sessionCovers(
  session: Session | undefined,
  required: readonly ScopeRequirement[]
): boolean {
  if (!session) return false;
  if (required.length === 0) {
    return Object.values(session.scopes).some((scope) => scope.accounts.length > 0);
  }
  return required.every((requirement) => {
    const chainId = typeof requirement === 'string' ? requirement : requirement.chainId;
    const methods = typeof requirement === 'string' ? [] : (requirement.methods ?? []);
    const scope = session.scopes[chainId];
    if (!scope?.accounts.length) return false;
    return methods.every((method) => scope.methods.includes(method));
  });
}

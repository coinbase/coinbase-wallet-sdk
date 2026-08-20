import { type Caip2, namespaceOf, parseCaip2 } from './caip.js';
import type { Session } from './types.js';

/**
 * True when `session` already has accounts for every required CAIP-2 chain.
 * eip155 is chain-agnostic here: any eip155 scope covers any other eip155 chain id.
 */
export function sessionCovers(session: Session | undefined, required: Caip2[]): boolean {
  if (!session) return false;
  if (required.length === 0) {
    return Object.values(session.scopes).some((scope) => scope.accounts.length > 0);
  }
  return required.every((id) => {
    if ((session.scopes[id]?.accounts.length ?? 0) > 0) return true;
    const parsed = parseCaip2(id);
    if (parsed?.namespace !== 'eip155') return false;
    return Object.entries(session.scopes).some(
      ([chainId, scope]) => namespaceOf(chainId) === 'eip155' && scope.accounts.length > 0
    );
  });
}

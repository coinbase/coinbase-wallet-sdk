import { type Caip2, namespaceOf, parseCaip2 } from './caip.js';
import type { Session } from './types.js';

/**
 * True when `session` already has accounts for every required CAIP-2 chain.
 *
 * Used by `ensureSession` to skip `pair`. Empty `required` means “any account
 * on any chain is enough.”
 *
 * eip155 is treated as chain-agnostic: a scope on `eip155:1` also covers
 * `eip155:8453`. EVM addresses are the same across chains in this SDK, so we
 * do not force another `wallet_connect` just to switch chain id. Solana /
 * bip122 later must match the exact CAIP-2.
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

import { standardErrors } from ':core/error/errors.js';
import { type Caip2, formatCaip2, parseCaip2 } from ':core/session/caip.js';

/**
 * CAIP-104 namespace identifier.
 *
 * This is both the scope key the SDK puts on the wire and the key its grant is stored
 * under: EVM authorization is namespace-wide, so no chain id is involved anywhere.
 */
export const EIP155_NAMESPACE = 'eip155';

/** Numeric EVM chain id to `eip155:<chainId>`. */
export function formatEip155ChainId(chainId: number): Caip2 {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw standardErrors.rpc.invalidParams(`Invalid eip155 chain id: ${chainId}`);
  }
  return formatCaip2('eip155', String(chainId));
}

/** `eip155:<chainId>` back to a numeric EVM chain id, or `null` if not eip155. */
export function parseEip155ChainId(value: Caip2): number | null {
  const parsed = parseCaip2(value);
  if (!parsed || parsed.namespace !== 'eip155' || !/^[1-9]\d*$/.test(parsed.reference)) {
    return null;
  }
  const chainId = Number(parsed.reference);
  return Number.isSafeInteger(chainId) && String(chainId) === parsed.reference ? chainId : null;
}

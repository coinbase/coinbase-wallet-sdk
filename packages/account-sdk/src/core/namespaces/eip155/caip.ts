import { standardErrors } from ':core/error/errors.js';
import {
  type Caip2,
  type Caip10,
  formatCaip10,
  formatCaip2,
  parseCaip2,
} from ':core/session/caip.js';

/** `eip155:<chainId>` for a numeric EVM chain id. */
export function eip155Caip2(chainId: number): Caip2 {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw standardErrors.rpc.invalidParams(`Invalid eip155 chain id: ${chainId}`);
  }
  return formatCaip2('eip155', String(chainId));
}

/** Numeric EVM chain id from an `eip155:…` CAIP-2, or `null` if not eip155. */
export function eip155ChainId(chainId: Caip2): number | null {
  const parsed = parseCaip2(chainId);
  if (!parsed || parsed.namespace !== 'eip155' || !/^[1-9]\d*$/.test(parsed.reference)) {
    return null;
  }
  const value = Number(parsed.reference);
  return Number.isSafeInteger(value) && String(value) === parsed.reference ? value : null;
}

/** `eip155:<chainId>:<address>` for an EVM account. */
export function formatEip155Account(chainId: number, address: string): Caip10 {
  return formatCaip10(eip155Caip2(chainId), address);
}

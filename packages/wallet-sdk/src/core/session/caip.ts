import { standardErrors } from ':core/error/errors.js';
import type { Caip2, Caip10, Namespace } from '../../storage/schema.js';
export type { Caip2, Caip10, Namespace } from '../../storage/schema.js';

/**
 * CAIP-2 / CAIP-10 helpers used by `Session` and `Envelope`.
 *
 * CAIP-2 chain id: `eip155:8453`. CAIP-10 account: `eip155:8453:0xabc…`.
 * Session scopes are keyed by CAIP-2 and contain CAIP-10 account lists.
 */
export type ParsedCaip2 = { namespace: Namespace; reference: string };
export type ParsedCaip10 = ParsedCaip2 & { account: string };

const CAIP2_RE = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,64}$/;
const CAIP10_RE = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,64}:[-.%a-zA-Z0-9]{1,128}$/;

/** Parse `eip155:8453` into `{ namespace, reference }`, or `null` if invalid. */
export function parseCaip2(value: string): ParsedCaip2 | null {
  if (!CAIP2_RE.test(value)) return null;
  const idx = value.indexOf(':');
  return { namespace: value.slice(0, idx), reference: value.slice(idx + 1) };
}

/** True when `value` matches CAIP-2 (`namespace:reference`). */
export function isCaip2(value: string): value is Caip2 {
  return CAIP2_RE.test(value);
}

/** Build a CAIP-2 id and throw if the result is not a valid CAIP-2 string. */
export function formatCaip2(namespace: Namespace, reference: string): Caip2 {
  const value = `${namespace}:${reference}`;
  if (!isCaip2(value)) throw standardErrors.rpc.invalidParams(`Invalid CAIP-2: ${value}`);
  return value;
}

/** Parse `eip155:8453:0xabc…` into `{ namespace, reference, account }`, or `null` if invalid. */
export function parseCaip10(value: string): ParsedCaip10 | null {
  if (!CAIP10_RE.test(value)) return null;
  const nsIdx = value.indexOf(':');
  const refIdx = value.indexOf(':', nsIdx + 1);
  return {
    namespace: value.slice(0, nsIdx),
    reference: value.slice(nsIdx + 1, refIdx),
    account: value.slice(refIdx + 1),
  };
}

/** True when `value` matches CAIP-10 (`namespace:reference:account`). */
export function isCaip10(value: string): value is Caip10 {
  return CAIP10_RE.test(value);
}

/** Build a CAIP-10 id from a CAIP-2 chain and an address/account string. */
export function formatCaip10(chainId: Caip2, account: string): Caip10 {
  const value = `${chainId}:${account}`;
  if (!isCaip10(value)) throw standardErrors.rpc.invalidParams(`Invalid CAIP-10: ${value}`);
  return value;
}

/** Namespace of a CAIP-2 chain or CAIP-10 account (`eip155`, `solana`, `bip122`, …). */
export function namespaceOf(id: string): Namespace {
  const parsed = parseCaip10(id) ?? parseCaip2(id);
  if (!parsed) {
    throw standardErrors.rpc.invalidParams(`Not a CAIP-2 or CAIP-10 identifier: ${id}`);
  }
  return parsed.namespace;
}

/** CAIP-2 chain portion of a CAIP-10 account. */
export function chainIdOf(account: Caip10): Caip2 {
  const parsed = parseCaip10(account);
  if (!parsed) throw standardErrors.rpc.invalidParams(`Invalid CAIP-10: ${account}`);
  return formatCaip2(parsed.namespace, parsed.reference);
}

/** Address/account portion of a CAIP-10 id, or the original string if it is not CAIP-10. */
export function accountOf(id: string): string {
  return parseCaip10(id)?.account ?? id;
}

/** CAIP-2 chain id, e.g. `eip155:8453`. */
export type Caip2 = `${string}:${string}`;

/** CAIP-10 account id, e.g. `eip155:8453:0xabc…`. */
export type Caip10 = `${Caip2}:${string}`;

export type ParsedCaip2 = { namespace: string; reference: string };
export type ParsedCaip10 = ParsedCaip2 & { account: string };

export const BITCOIN_MAINNET = 'bip122:000000000019d6689c085ae165831e93' as const satisfies Caip2;
export const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const satisfies Caip2;

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
export function formatCaip2(namespace: string, reference: string): Caip2 {
  const value = `${namespace}:${reference}`;
  if (!isCaip2(value)) throw new Error(`Invalid CAIP-2: ${value}`);
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
  if (!isCaip10(value)) throw new Error(`Invalid CAIP-10: ${value}`);
  return value;
}

/** Namespace of a CAIP-2 chain or CAIP-10 account (`eip155`, `solana`, `bip122`, …). */
export function namespaceOf(id: string): string {
  const parsed = parseCaip10(id) ?? parseCaip2(id);
  if (!parsed) throw new Error(`Not a CAIP-2 or CAIP-10 identifier: ${id}`);
  return parsed.namespace;
}

/** CAIP-2 chain portion of a CAIP-10 account. */
export function chainIdOf(account: Caip10): Caip2 {
  const parsed = parseCaip10(account);
  if (!parsed) throw new Error(`Invalid CAIP-10: ${account}`);
  return formatCaip2(parsed.namespace, parsed.reference);
}

/** Address/account portion of a CAIP-10 id, or the original string if it is not CAIP-10. */
export function accountOf(id: string): string {
  return parseCaip10(id)?.account ?? id;
}

/** `eip155:<chainId>` for a numeric EVM chain id. */
export function eip155Caip2(chainId: number): Caip2 {
  return formatCaip2('eip155', String(chainId));
}

/** Numeric EVM chain id from an `eip155:…` CAIP-2, or `null` if not eip155. */
export function eip155ChainId(chainId: Caip2): number | null {
  const parsed = parseCaip2(chainId);
  if (!parsed || parsed.namespace !== 'eip155') return null;
  const n = Number(parsed.reference);
  return Number.isInteger(n) ? n : null;
}

/** `eip155:<chainId>:<address>` for an EVM account. */
export function formatEip155Account(chainId: number, address: string): Caip10 {
  return formatCaip10(eip155Caip2(chainId), address);
}

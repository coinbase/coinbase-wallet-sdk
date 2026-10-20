import { standardErrors } from ':core/error/errors.js';

/**
 * Readers for untrusted JSON-RPC values at a strict boundary.
 *
 * The throwing readers raise `internal`, because they guard boundaries the dapp cannot fix:
 * a value this SDK built, or one a wallet sent back. A parser reading the dapp's own params
 * wants `invalidParams` instead, so it should throw for itself rather than reach for these.
 *
 * `label` names the value in the error message, usually as its dotted path in the payload,
 * such as `wallet_createSession.result.sessionId`.
 */

/**
 * True when a wire value is a plain object.
 *
 * Arrays are rejected: every caller is reading named fields off a JSON-RPC payload,
 * and an array would silently answer `undefined` for all of them.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** The same check, shaped for callers that want the value rather than a branch. */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

/** The value as a string; throws when it is missing, not a string, or empty. */
export function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw standardErrors.rpc.internal(`${label} must be a string`);
  }
  return value;
}

/** A copy of the value as a string array; throws unless every item is a non-empty string. */
export function stringArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.length === 0)
  ) {
    throw standardErrors.rpc.internal(`${label} must be an array of non-empty strings`);
  }
  return [...value];
}

/** The value as a plain object, or `undefined` when absent; throws when it is anything else. */
export function optionalRecord(value: unknown, label: string): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  const record = asRecord(value);
  if (!record) throw standardErrors.rpc.internal(`${label} must be an object`);
  return record;
}

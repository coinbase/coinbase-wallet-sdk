import { standardErrors } from ':core/error/errors.js';

/**
 * Readers for untrusted JSON-RPC values at a strict boundary.
 *
 * The throwing readers raise `internal` and name the field path, because they guard
 * boundaries the dapp cannot fix: a value this SDK built, or one a wallet sent back.
 * A parser reading the dapp's own params wants `invalidParams` instead, so it should
 * throw for itself rather than reach for these.
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

export function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw standardErrors.rpc.internal(`${field} must be a string`);
  }
  return value;
}

export function stringArray(value: unknown, field: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.length === 0)
  ) {
    throw standardErrors.rpc.internal(`${field} must be an array of non-empty strings`);
  }
  return [...value];
}

export function optionalRecord(value: unknown, field: string): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  const record = asRecord(value);
  if (!record) throw standardErrors.rpc.internal(`${field} must be an object`);
  return record;
}

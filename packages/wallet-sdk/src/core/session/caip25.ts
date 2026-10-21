import { standardErrors } from ':core/error/errors.js';
import { asRecord, optionalRecord, stringArray } from ':util/guards.js';
import type { NamespaceGrant, Session } from './types.js';

/**
 * Read the wallet's `wallet_createSession` result into one grant per namespace.
 *
 * Only namespace-keyed scopes become grants. The SDK only asks for whole namespaces and SCW
 * answers with the same keys, sending per-chain facts in `properties.chainMetadata`, so a
 * chain-keyed scope is ignored. A `sessionId`, which CAIP-25 lets a wallet return, is not
 * read: the session is the pairing.
 */
export function sessionFromCaip25Result(value: unknown): Session {
  const result = asRecord(value);
  if (!result) {
    throw standardErrors.rpc.internal('wallet_createSession.result must be an object');
  }
  const scopes = asRecord(result.scopes);
  if (!scopes) {
    throw standardErrors.rpc.internal('wallet_createSession.result.scopes must be an object');
  }
  const properties = optionalRecord(result.properties, 'wallet_createSession.result.properties');

  const namespaces = Object.fromEntries(
    Object.entries(scopes).flatMap(([scopeKey, scope]) =>
      /^[-a-z0-9]{3,8}$/.test(scopeKey)
        ? [[scopeKey, parseGrant(scope, `wallet_createSession.result.scopes.${scopeKey}`)]]
        : []
    )
  );
  return { namespaces, ...(properties ? { properties } : {}) };
}

/** A namespace scope as a stored grant; `notifications` and any chain list are not kept. */
function parseGrant(value: unknown, label: string): NamespaceGrant {
  const scope = asRecord(value);
  if (!scope) throw standardErrors.rpc.internal(`${label} must be an object`);
  const accounts = stringArray(scope.accounts, `${label}.accounts`);
  const capabilities = optionalRecord(scope.capabilities, `${label}.capabilities`);
  const accountCapabilities = parseAccountCapabilities(
    scope.accountCapabilities,
    accounts,
    `${label}.accountCapabilities`
  );
  return {
    accounts,
    methods: stringArray(scope.methods, `${label}.methods`),
    ...(capabilities ? { capabilities } : {}),
    ...(accountCapabilities ? { accountCapabilities } : {}),
  };
}

/**
 * Each granted account's answers, which must be an object. Keys for accounts the scope did not
 * grant are dropped rather than failing a connect the user already approved: they are only ever
 * read by granted account.
 */
function parseAccountCapabilities(
  value: unknown,
  accounts: string[],
  label: string
): Record<string, Record<string, unknown>> | undefined {
  const record = optionalRecord(value, label);
  if (!record) return undefined;
  const parsed: Record<string, Record<string, unknown>> = {};
  for (const [account, capabilities] of Object.entries(record)) {
    if (!accounts.includes(account)) continue;
    const answers = asRecord(capabilities);
    if (!answers) throw standardErrors.rpc.internal(`${label}.${account} must be an object`);
    parsed[account] = answers;
  }
  return parsed;
}

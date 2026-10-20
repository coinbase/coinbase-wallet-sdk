import { standardErrors } from ':core/error/errors.js';
import { asRecord, nonEmptyString, optionalRecord, stringArray } from ':util/guards.js';
import { parseChainMetadata } from '../../storage/chainMetadata.js';
import type { NamespaceGrant, Session } from './types.js';

/**
 * Read the wallet's `wallet_createSession` result into one grant per namespace.
 *
 * Only namespace-keyed scopes become grants. The SDK only asks for whole namespaces and SCW
 * answers with the same keys, sending per-chain facts in `properties.chainMetadata`, so a
 * chain-keyed scope is ignored. Nothing else in `properties` is kept.
 */
export function sessionFromCaip25Result(value: unknown): Session {
  const result = asRecord(value);
  if (!result) {
    throw standardErrors.rpc.internal('wallet_createSession.result must be an object');
  }
  const sessionId = nonEmptyString(result.sessionId, 'wallet_createSession.result.sessionId');
  const scopes = asRecord(result.scopes);
  if (!scopes) {
    throw standardErrors.rpc.internal('wallet_createSession.result.scopes must be an object');
  }
  const properties = optionalRecord(result.properties, 'wallet_createSession.result.properties');
  const chainMetadata = parseChainMetadata(properties?.chainMetadata);

  const namespaces = Object.fromEntries(
    Object.entries(scopes).flatMap(([scopeKey, scope]) =>
      /^[-a-z0-9]{3,8}$/.test(scopeKey)
        ? [[scopeKey, parseGrant(scope, `wallet_createSession.result.scopes.${scopeKey}`)]]
        : []
    )
  );
  return { sessionId, namespaces, ...(chainMetadata ? { chainMetadata } : {}) };
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

/** Every key must be an account this scope granted, and every value an object. */
function parseAccountCapabilities(
  value: unknown,
  accounts: string[],
  label: string
): Record<string, Record<string, unknown>> | undefined {
  const record = optionalRecord(value, label);
  if (!record) return undefined;
  return Object.fromEntries(
    Object.entries(record).map(([account, capabilities]) => {
      if (!accounts.includes(account)) {
        throw standardErrors.rpc.internal(`${label}.${account} is not a granted account`);
      }
      const parsed = asRecord(capabilities);
      if (!parsed) throw standardErrors.rpc.internal(`${label}.${account} must be an object`);
      return [account, parsed];
    })
  );
}

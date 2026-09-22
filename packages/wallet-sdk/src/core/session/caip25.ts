import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/message/RequestArguments.js';
import { asRecord, nonEmptyString, optionalRecord, stringArray } from ':util/wire.js';
import { type Caip2, isCaip2, isCaip10, namespaceOf } from './caip.js';
import type {
  Caip25PrivateScopeParams,
  Caip25RequestParams,
  Caip25RequestScope,
  Caip25Result,
  Caip25ResultScope,
  ScopeState,
  Session,
} from './types.js';

export const WALLET_CREATE_SESSION = 'wallet_createSession';

const CAIP_NAMESPACE_RE = /^[-a-z0-9]{3,8}$/;

/**
 * Each reference listed by a namespace-keyed scope must form a valid CAIP-2 chain.
 *
 * The references stay on the scope as written; this only rejects the ones that could
 * not name a chain.
 */
function assertScopeChains(scopeKey: string, chains: string[] | undefined, field: string): void {
  if (chains === undefined) return;
  if (isCaip2(scopeKey)) {
    throw standardErrors.rpc.internal(`${field}.chains must not be present on a chain-keyed scope`);
  }
  chains.forEach((reference, index) => {
    if (!isCaip2(`${scopeKey}:${reference}`)) {
      throw standardErrors.rpc.internal(
        `${field}.chains[${index}] is not a valid CAIP-2 reference`
      );
    }
  });
}

/**
 * Accounts are raw addresses, never CAIP-10 ids.
 *
 * Validated against the scope's own namespace, with a null reference standing in for the
 * chain a namespace-wide grant deliberately does not have.
 */
function validateScopeAccounts(accounts: string[], scopeKey: string, field: string): void {
  const prefix = isCaip2(scopeKey) ? scopeKey : `${scopeKey}:0`;
  if (accounts.some((account) => !isCaip10(`${prefix}:${account}`))) {
    throw standardErrors.rpc.internal(`${field} must contain raw account addresses`);
  }
}

/**
 * Both directions are checked by the same parsers, and neither failure is the dapp's
 * doing: a request failure means this SDK built a bad `wallet_createSession`, a result
 * failure means the wallet answered with one. The field path says which — request fields
 * read `wallet_createSession.scopes…`, result fields `wallet_createSession.result.scopes…`.
 */
function parseRequestScope(
  record: Record<string, unknown>,
  scopeKey: string,
  field: string
): Caip25RequestScope {
  const chains =
    record.chains === undefined ? undefined : stringArray(record.chains, `${field}.chains`);
  assertScopeChains(scopeKey, chains, field);
  const accounts =
    record.accounts === undefined ? undefined : stringArray(record.accounts, `${field}.accounts`);
  if (accounts) validateScopeAccounts(accounts, scopeKey, `${field}.accounts`);

  // `params` carries the private wallet_connect extension: exactly one object, and its
  // capabilities belong on the scope so the wallet reads them in one place.
  let params: Caip25PrivateScopeParams | undefined;
  if (record.params !== undefined) {
    if (!Array.isArray(record.params) || record.params.length !== 1) {
      throw standardErrors.rpc.internal(
        `${field}.params must contain exactly one wallet_connect params object`
      );
    }
    const first = asRecord(record.params[0]);
    if (!first) throw standardErrors.rpc.internal(`${field}.params[0] must be an object`);
    if (Object.prototype.hasOwnProperty.call(first, 'capabilities')) {
      throw standardErrors.rpc.internal(
        `${field}.params[0].capabilities must be carried in the scope capabilities extension`
      );
    }
    params = [{ ...first, version: nonEmptyString(first.version, `${field}.params[0].version`) }];
  }

  const capabilities = optionalRecord(record.capabilities, `${field}.capabilities`);
  return {
    ...(chains ? { chains } : {}),
    ...(accounts ? { accounts } : {}),
    methods: stringArray(record.methods, `${field}.methods`),
    notifications: stringArray(record.notifications, `${field}.notifications`),
    ...(capabilities ? { capabilities } : {}),
    ...(params ? { params } : {}),
  };
}

function parseResultScope(
  record: Record<string, unknown>,
  scopeKey: string,
  field: string
): Caip25ResultScope {
  if (record.params !== undefined) {
    throw standardErrors.rpc.internal(`${field}.params is not permitted in a CAIP-25 result`);
  }
  const chains =
    record.chains === undefined ? undefined : stringArray(record.chains, `${field}.chains`);
  assertScopeChains(scopeKey, chains, field);
  // Unlike a request, a result must say who it granted.
  const accounts = stringArray(record.accounts, `${field}.accounts`);
  validateScopeAccounts(accounts, scopeKey, `${field}.accounts`);
  const capabilities = optionalRecord(record.capabilities, `${field}.capabilities`);
  return {
    ...(chains ? { chains } : {}),
    accounts,
    methods: stringArray(record.methods, `${field}.methods`),
    notifications: stringArray(record.notifications, `${field}.notifications`),
    ...(capabilities ? { capabilities } : {}),
  };
}

/**
 * Walk the scope map, checking each key before handing its object to the parser.
 *
 * A scope key is a CAIP-2 chain id or a bare CAIP-104 namespace, as CAIP-25 allows. A
 * namespace key carrying no `chains` is how this SDK asks for a whole namespace.
 * CAIP-217 reads an absent chain list as zero chains rather than a wildcard, so that
 * reading is a private SDK↔wallet agreement, not a standard guarantee — which is why it
 * never survives past `sessionFromCaip25Result`: storage always keys by CAIP-2.
 */
function parseScopes<T>(
  value: unknown,
  field: string,
  parseScope: (record: Record<string, unknown>, scopeKey: string, field: string) => T
): Record<string, T> {
  const scopes = asRecord(value);
  if (!scopes || Object.keys(scopes).length === 0) {
    throw standardErrors.rpc.internal(`${field} must be a non-empty object`);
  }
  return Object.fromEntries(
    Object.entries(scopes).map(([scopeKey, scope]) => {
      const scopeField = `${field}.${scopeKey}`;
      if (!isCaip2(scopeKey) && !CAIP_NAMESPACE_RE.test(scopeKey)) {
        throw standardErrors.rpc.internal(
          `${scopeField} must be keyed by a CAIP-2 chain id or a CAIP namespace`
        );
      }
      const record = asRecord(scope);
      if (!record) throw standardErrors.rpc.internal(`${scopeField} must be an object`);
      return [scopeKey, parseScope(record, scopeKey, scopeField)];
    })
  );
}

/**
 * Strictly parse a CAIP-25 request plus the private Coinbase request-scope
 * extensions before it is put on the wallet wire.
 */
export function parseCaip25Request(args: RequestArguments): Caip25RequestParams {
  if (args.method !== WALLET_CREATE_SESSION) {
    throw standardErrors.rpc.internal(`expected ${WALLET_CREATE_SESSION}`);
  }
  const record = asRecord(args.params);
  if (!record) {
    throw standardErrors.rpc.internal('wallet_createSession params must be an object');
  }
  const sessionId =
    record.sessionId === undefined
      ? undefined
      : nonEmptyString(record.sessionId, 'wallet_createSession.sessionId');
  const properties = optionalRecord(record.properties, 'wallet_createSession.properties');
  return {
    ...(sessionId ? { sessionId } : {}),
    scopes: parseScopes(record.scopes, 'wallet_createSession.scopes', parseRequestScope),
    ...(properties ? { properties } : {}),
  };
}

/** Strictly parse a standard decrypted CAIP-25 wallet result (no private request params). */
export function parseCaip25Result(value: unknown): Caip25Result {
  const record = asRecord(value);
  if (!record) {
    throw standardErrors.rpc.internal('wallet_createSession.result must be an object');
  }
  const sessionId = nonEmptyString(record.sessionId, 'wallet_createSession.result.sessionId');
  const properties = optionalRecord(record.properties, 'wallet_createSession.result.properties');
  return {
    sessionId,
    scopes: parseScopes(record.scopes, 'wallet_createSession.result.scopes', parseResultScope),
    ...(properties ? { properties } : {}),
  };
}

/** Build and boundary-check a CAIP-25 request. */
export function createCaip25Request(opts: {
  scopes: Record<string, Caip25RequestScope>;
  sessionId?: string;
  properties?: Record<string, unknown>;
}): RequestArguments {
  const request = {
    method: WALLET_CREATE_SESSION,
    params: {
      ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
      scopes: opts.scopes,
      ...(opts.properties ? { properties: opts.properties } : {}),
    },
  };
  // Keep builder and wire acceptance identical; never emit a shape our strict boundary rejects.
  parseCaip25Request(request);
  return request;
}

/**
 * Turn CAIP-25 grants into kernel authorization state.
 *
 * Authorization is stored per namespace, so ingest sorts each returned scope by what it
 * actually says:
 *
 * - a namespace scope (`eip155`) is the grant, stored as-is;
 * - a chain scope contributes chain-specific facts, not authorization, so its
 *   capabilities are folded into the chain catalog in `properties.chainMetadata`;
 * - a chain scope in a namespace with no namespace grant is that namespace's only
 *   authorization (how Solana pairs), so it becomes the namespace grant.
 *
 * A namespace scope carrying `chains` is rejected: it asks for narrower authorization
 * than this model can express, and silently widening it would over-authorize.
 */
export function sessionFromCaip25Result(value: unknown): Session {
  const result = parseCaip25Result(value);
  const grantFrom = (scope: Caip25ResultScope): ScopeState => ({
    accounts: [...scope.accounts],
    methods: [...scope.methods],
    ...(scope.capabilities ? { capabilities: scope.capabilities } : {}),
  });

  const namespaces: Session['namespaces'] = {};
  const chainCapabilities: Record<string, { capabilities: Record<string, unknown> }> = {};
  const chainScopes: [Caip2, Caip25ResultScope][] = [];

  for (const [scopeKey, scope] of Object.entries(result.scopes)) {
    const field = `wallet_createSession.result.scopes.${scopeKey}`;
    if (isCaip2(scopeKey)) {
      chainScopes.push([scopeKey, scope]);
      continue;
    }
    if (scope.chains !== undefined) {
      throw standardErrors.rpc.internal(
        `${field}.chains cannot narrow a namespace grant; authorization is per namespace`
      );
    }
    if (namespaces[scopeKey]) {
      throw standardErrors.rpc.internal(`${field} is a duplicate namespace grant`);
    }
    namespaces[scopeKey] = grantFrom(scope);
  }

  for (const [chainId, scope] of chainScopes) {
    const namespace = namespaceOf(chainId);
    if (!namespaces[namespace]) {
      namespaces[namespace] = grantFrom(scope);
      continue;
    }
    // The namespace grant already carries the accounts; only this chain's capabilities
    // are new information, and those belong with the rest of the per-chain facts.
    if (scope.capabilities) chainCapabilities[chainId] = { capabilities: scope.capabilities };
  }

  // Fold the collected chain capabilities into the wallet's chain catalog.
  let properties = result.properties;
  if (Object.keys(chainCapabilities).length > 0) {
    const catalog: Record<string, unknown> = { ...asRecord(properties?.chainMetadata) };
    for (const [chainId, entry] of Object.entries(chainCapabilities)) {
      catalog[chainId] = { ...asRecord(catalog[chainId]), ...entry };
    }
    properties = { ...properties, chainMetadata: catalog };
  }

  return {
    sessionId: result.sessionId,
    namespaces,
    ...(properties ? { properties } : {}),
  };
}

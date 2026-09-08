import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/message/RequestArguments.js';
import { type Caip2, type Namespace, formatCaip10, isCaip10, parseCaip2 } from './caip.js';
import type { Session } from './types.js';

export const WALLET_CREATE_SESSION = 'wallet_createSession';

export type Caip25PrivateScopeParams = [
  {
    version: string;
    [key: string]: unknown;
  },
];

/**
 * CAIP-25 request scopes standardize chains, accounts, methods, and
 * notifications. `capabilities` and `params` below are Coinbase-private
 * SDK↔SCW request extensions and are not currently standardized by CAIP-25.
 */
export type Caip25RequestScope = {
  chains?: string[];
  accounts?: string[];
  methods: string[];
  notifications: string[];
  /** Coinbase-private SDK↔SCW request extension; not standard CAIP-25. */
  capabilities?: Record<string, unknown>;
  /** Coinbase-private wallet_connect params extension; not standard CAIP-25. */
  params?: Caip25PrivateScopeParams;
};

/** Standard CAIP-25 result scope. Result capabilities are standardized; params are not present. */
export type Caip25ResultScope = {
  chains?: string[];
  accounts: string[];
  methods: string[];
  notifications: string[];
  capabilities?: Record<string, unknown>;
};

/** Private request fields attached to the namespace scope by this SDK. */
export type Caip25PrivateRequestScopeExtensions = {
  capabilities?: Record<string, unknown>;
  params: Caip25PrivateScopeParams;
};

export type Caip25RequestParams = {
  sessionId?: string;
  scopes: Record<string, Caip25RequestScope>;
  /** Generic CAIP-25 session metadata; private request extensions do not live here. */
  properties?: Record<string, unknown>;
};

export type Caip25Result = {
  sessionId: string;
  scopes: Record<string, Caip25ResultScope>;
  properties?: Record<string, unknown>;
};

export type Caip25Request = {
  method: typeof WALLET_CREATE_SESSION;
  params: Caip25RequestParams;
};

type Invalid = (message: string) => never;
const CAIP_NAMESPACE_RE = /^[-a-z0-9]{3,8}$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown, field: string, invalid: Invalid): string {
  if (typeof value !== 'string' || value.length === 0) invalid(`${field} must be a string`);
  return value as string;
}

function stringArray(value: unknown, field: string, invalid: Invalid): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.length === 0)
  ) {
    invalid(`${field} must be an array of non-empty strings`);
  }
  return [...(value as string[])];
}

function optionalRecord(
  value: unknown,
  field: string,
  invalid: Invalid
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  const record = asRecord(value);
  if (!record) invalid(`${field} must be an object`);
  return record as Record<string, unknown>;
}

function requestScopeParams(
  value: unknown,
  field: string,
  invalid: Invalid
): Caip25PrivateScopeParams | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length !== 1) {
    invalid(`${field} must contain exactly one wallet_connect params object`);
  }
  const first = asRecord((value as unknown[])[0]);
  if (!first) invalid(`${field}[0] must be an object`);
  const record = first as Record<string, unknown>;
  const version = nonEmptyString(record.version, `${field}[0].version`, invalid);
  if (Object.prototype.hasOwnProperty.call(record, 'capabilities')) {
    invalid(`${field}[0].capabilities must be carried in the scope capabilities extension`);
  }
  return [{ ...record, version }];
}

function scopeNamespace(scopeKey: string, field: string, invalid: Invalid): Namespace {
  const namespace = parseCaip2(scopeKey)?.namespace ?? scopeKey;
  if (!CAIP_NAMESPACE_RE.test(namespace)) {
    invalid(`${field} must use a valid CAIP namespace or CAIP-2 scope`);
  }
  return namespace;
}

function scopeChainIds(
  scopeKey: string,
  chains: string[] | undefined,
  field: string,
  invalid: Invalid
): { chainIds: Caip2[] } {
  const namespace = scopeNamespace(scopeKey, field, invalid);
  const parsed = parseCaip2(scopeKey);
  if (!parsed && !chains?.length) {
    invalid(`${field}.chains must identify at least one ${namespace} chain`);
  }
  if (parsed && chains?.some((chain) => chain !== parsed.reference)) {
    invalid(`${field}.chains must match its ${namespace} scope key`);
  }

  const references = parsed ? [parsed.reference] : (chains as string[]);
  return {
    chainIds: references.map((reference, index) => {
      const referenceField = parsed ? field : `${field}.chains[${index}]`;
      const chainId = `${namespace}:${reference}`;
      if (!parseCaip2(chainId)) invalid(`${referenceField} must be a valid CAIP-2 reference`);
      return chainId as Caip2;
    }),
  };
}

function validateRawAccounts(
  accounts: string[],
  chainId: Caip2,
  field: string,
  invalid: Invalid
): void {
  if (accounts.some((account) => !isCaip10(`${chainId}:${account}`))) {
    invalid(`${field} must contain raw CAIP account addresses`);
  }
}

function parseRequestScope(value: unknown, field: string, invalid: Invalid): Caip25RequestScope {
  const scope = asRecord(value);
  if (!scope) invalid(`${field} must be an object`);
  const record = scope as Record<string, unknown>;
  const chains =
    record.chains === undefined
      ? undefined
      : stringArray(record.chains, `${field}.chains`, invalid);
  const { chainIds } = scopeChainIds(
    field.slice('wallet_createSession.scopes.'.length),
    chains,
    field,
    invalid
  );
  const accounts =
    record.accounts === undefined
      ? undefined
      : stringArray(record.accounts, `${field}.accounts`, invalid);
  if (accounts) validateRawAccounts(accounts, chainIds[0] as Caip2, `${field}.accounts`, invalid);
  const capabilities = optionalRecord(record.capabilities, `${field}.capabilities`, invalid);
  const params = requestScopeParams(record.params, `${field}.params`, invalid);
  return {
    ...(chains ? { chains } : {}),
    ...(accounts ? { accounts } : {}),
    methods: stringArray(record.methods, `${field}.methods`, invalid),
    notifications: stringArray(record.notifications, `${field}.notifications`, invalid),
    ...(capabilities ? { capabilities } : {}),
    ...(params ? { params } : {}),
  };
}

function parseResultScope(value: unknown, field: string, invalid: Invalid): Caip25ResultScope {
  const scope = asRecord(value);
  if (!scope) invalid(`${field} must be an object`);
  const record = scope as Record<string, unknown>;
  if (record.params !== undefined) {
    invalid(`${field}.params is not permitted in a CAIP-25 result`);
  }
  const chains =
    record.chains === undefined
      ? undefined
      : stringArray(record.chains, `${field}.chains`, invalid);
  const { chainIds } = scopeChainIds(
    field.slice('wallet_createSession.result.scopes.'.length),
    chains,
    field,
    invalid
  );
  const accounts = stringArray(record.accounts, `${field}.accounts`, invalid);
  validateRawAccounts(accounts, chainIds[0] as Caip2, `${field}.accounts`, invalid);
  const capabilities = optionalRecord(record.capabilities, `${field}.capabilities`, invalid);
  return {
    ...(chains ? { chains } : {}),
    accounts,
    methods: stringArray(record.methods, `${field}.methods`, invalid),
    notifications: stringArray(record.notifications, `${field}.notifications`, invalid),
    ...(capabilities ? { capabilities } : {}),
  };
}

function parseScopes<T>(
  value: unknown,
  field: string,
  invalid: Invalid,
  parseScope: (value: unknown, field: string, invalid: Invalid) => T
): Record<string, T> {
  const scopes = asRecord(value);
  if (!scopes || Object.keys(scopes).length === 0) {
    invalid(`${field} must be a non-empty object`);
  }
  return Object.fromEntries(
    Object.entries(scopes as Record<string, unknown>).map(([scopeKey, scope]) => [
      scopeKey,
      parseScope(scope, `${field}.${scopeKey}`, invalid),
    ])
  );
}

/**
 * Strictly parse a CAIP-25 request plus the private Coinbase request-scope
 * extensions before it is put on the wallet wire.
 */
export function parseCaip25Request(args: RequestArguments): Caip25RequestParams {
  const invalid: Invalid = (message) => {
    throw standardErrors.rpc.invalidParams(message);
  };
  if (args.method !== WALLET_CREATE_SESSION) {
    invalid(`expected ${WALLET_CREATE_SESSION}`);
  }
  const params = asRecord(args.params);
  if (!params) invalid('wallet_createSession params must be an object');
  const record = params as Record<string, unknown>;
  const sessionId =
    record.sessionId === undefined
      ? undefined
      : nonEmptyString(record.sessionId, 'wallet_createSession.sessionId', invalid);
  const properties = optionalRecord(record.properties, 'wallet_createSession.properties', invalid);
  return {
    ...(sessionId ? { sessionId } : {}),
    scopes: parseScopes(record.scopes, 'wallet_createSession.scopes', invalid, parseRequestScope),
    ...(properties ? { properties } : {}),
  };
}

/** Strictly parse a standard decrypted CAIP-25 wallet result (no private request params). */
export function parseCaip25Result(value: unknown): Caip25Result {
  const invalid: Invalid = (message) => {
    throw standardErrors.rpc.internal(`Invalid wallet_createSession result: ${message}`);
  };
  const result = asRecord(value);
  if (!result) invalid('result must be an object');
  const record = result as Record<string, unknown>;
  const sessionId = nonEmptyString(
    record.sessionId,
    'wallet_createSession.result.sessionId',
    invalid
  );
  const properties = optionalRecord(
    record.properties,
    'wallet_createSession.result.properties',
    invalid
  );
  return {
    sessionId,
    scopes: parseScopes(
      record.scopes,
      'wallet_createSession.result.scopes',
      invalid,
      parseResultScope
    ),
    ...(properties ? { properties } : {}),
  };
}

/** Build and boundary-check a namespace-specific CAIP-25 request. */
export function createCaip25Request(opts: {
  scopes: Record<string, Caip25RequestScope>;
  sessionId?: string;
  properties?: Record<string, unknown>;
}): Caip25Request {
  const request: Caip25Request = {
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
 * Expand compact namespace grants into exact CAIP-2 scopes.
 *
 * CAIP-25 may grant a namespace plus chain references, while kernel authorization
 * needs one concrete `Session.scopes[chainId]` entry per chain.
 */
export function sessionFromCaip25Result(value: unknown): Session {
  const result = parseCaip25Result(value);
  const scopes: Session['scopes'] = {};

  for (const [scopeKey, scope] of Object.entries(result.scopes)) {
    const invalid: Invalid = (message) => {
      throw standardErrors.rpc.internal(`Invalid wallet_createSession result: ${message}`);
    };
    const { chainIds } = scopeChainIds(
      scopeKey,
      scope.chains,
      `wallet_createSession.result.scopes.${scopeKey}`,
      invalid
    );
    for (const chainId of chainIds) {
      if (scopes[chainId]) {
        throw standardErrors.rpc.internal(
          `Invalid wallet_createSession result: duplicate expanded scope ${chainId}`
        );
      }
      scopes[chainId] = {
        accounts: scope.accounts.map((account) => formatCaip10(chainId, account)),
        methods: [...scope.methods],
        ...(scope.capabilities ? { capabilities: scope.capabilities } : {}),
      };
    }
  }

  return {
    sessionId: result.sessionId,
    scopes,
    ...(result.properties ? { properties: result.properties } : {}),
  };
}

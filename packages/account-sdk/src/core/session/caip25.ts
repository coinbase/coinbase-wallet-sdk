import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { Address } from ':core/type/index.js';
import { isAddress } from 'viem';
import { type Caip2, accountOf, eip155Caip2, formatEip155Account, parseCaip2 } from './caip.js';
import type { Session, TransportKind } from './types.js';

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

export type Caip25ConnectResult = {
  accounts: {
    address: Address;
    capabilities?: Record<string, unknown>;
  }[];
};

type Invalid = (message: string) => never;

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

function eip155Reference(value: string, field: string, invalid: Invalid): string {
  const chainId = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(chainId) || String(chainId) !== value) {
    invalid(`${field} must be a positive eip155 chain reference`);
  }
  return String(chainId);
}

function scopeChainIds(
  scopeKey: string,
  chains: string[] | undefined,
  field: string,
  invalid: Invalid
): Caip2[] {
  if (scopeKey === 'eip155') {
    if (!chains?.length) invalid(`${field}.chains must identify at least one eip155 chain`);
    return (chains as string[]).map((reference, index) =>
      eip155Caip2(Number(eip155Reference(reference, `${field}.chains[${index}]`, invalid)))
    );
  }

  const parsed = parseCaip2(scopeKey);
  if (!parsed || parsed.namespace !== 'eip155') {
    invalid(`${field} must be an eip155 scope`);
  }
  const reference = eip155Reference(
    (parsed as NonNullable<typeof parsed>).reference,
    field,
    invalid
  );
  if (chains?.some((chain) => chain !== reference)) {
    invalid(`${field}.chains must match its eip155 scope key`);
  }
  return [scopeKey as Caip2];
}

function parseRequestScope(value: unknown, field: string, invalid: Invalid): Caip25RequestScope {
  const scope = asRecord(value);
  if (!scope) invalid(`${field} must be an object`);
  const record = scope as Record<string, unknown>;
  const chains =
    record.chains === undefined
      ? undefined
      : stringArray(record.chains, `${field}.chains`, invalid);
  scopeChainIds(field.slice('wallet_createSession.scopes.'.length), chains, field, invalid);
  const accounts =
    record.accounts === undefined
      ? undefined
      : stringArray(record.accounts, `${field}.accounts`, invalid);
  if (accounts?.some((account) => !isAddress(account))) {
    invalid(`${field}.accounts must contain raw eip155 addresses`);
  }
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
  scopeChainIds(field.slice('wallet_createSession.result.scopes.'.length), chains, field, invalid);
  const accounts = stringArray(record.accounts, `${field}.accounts`, invalid);
  if (accounts.some((account) => !isAddress(account))) {
    invalid(`${field}.accounts must contain raw eip155 addresses`);
  }
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

/**
 * Build the eip155 CAIP-25 request used by this SDK.
 *
 * The namespace scope and decimal `chains` shape are standard CAIP-25. The
 * scope `capabilities` and `params` fields are the private SDK↔SCW extension.
 */
export function createCaip25Request(opts: {
  chainId: Caip2;
  methods: readonly string[];
  requestParts: Caip25PrivateRequestScopeExtensions;
  sessionId?: string;
  properties?: Record<string, unknown>;
}): Caip25Request {
  const parsed = parseCaip2(opts.chainId);
  const numericChainId = parsed ? Number(parsed.reference) : Number.NaN;
  if (
    !parsed ||
    parsed.namespace !== 'eip155' ||
    !/^[1-9]\d*$/.test(parsed.reference) ||
    !Number.isSafeInteger(numericChainId) ||
    String(numericChainId) !== parsed.reference
  ) {
    throw standardErrors.provider.unsupportedChain(`Unsupported CAIP-25 chain ${opts.chainId}`);
  }
  const request: Caip25Request = {
    method: WALLET_CREATE_SESSION,
    params: {
      ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
      scopes: {
        eip155: {
          chains: [parsed.reference],
          methods: [...new Set(opts.methods)],
          notifications: ['accountsChanged', 'chainChanged'],
          ...(opts.requestParts.capabilities
            ? { capabilities: opts.requestParts.capabilities }
            : {}),
          params: [{ ...opts.requestParts.params[0] }],
        },
      },
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
 * CAIP-25 may grant `eip155` plus multiple chain references, while kernel
 * authorization needs one concrete `Session.scopes[chainId]` entry per chain.
 */
export function sessionFromCaip25Result(
  value: unknown,
  opts: { preferredChainId: Caip2; transportKind?: TransportKind }
): Session {
  const result = parseCaip25Result(value);
  const scopes: Session['scopes'] = {};

  for (const [scopeKey, scope] of Object.entries(result.scopes)) {
    const invalid: Invalid = (message) => {
      throw standardErrors.rpc.internal(`Invalid wallet_createSession result: ${message}`);
    };
    const chainIds = scopeChainIds(
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
      const chain = Number(
        (parseCaip2(chainId) as NonNullable<ReturnType<typeof parseCaip2>>).reference
      );
      scopes[chainId] = {
        accounts: scope.accounts.map((account) => formatEip155Account(chain, account)),
        methods: [...scope.methods],
        ...(scope.capabilities ? { capabilities: scope.capabilities } : {}),
      };
    }
  }

  const preferred = scopes[opts.preferredChainId]?.accounts[0];
  const selected =
    preferred ?? Object.values(scopes).find((scope) => scope.accounts[0])?.accounts[0];
  return {
    sessionId: result.sessionId,
    scopes,
    selected: selected ? { eip155: selected } : {},
    transportKind: opts.transportKind ?? 'popup',
  };
}

/** ERC-7846 projection of the granted accounts on one exact CAIP-25 scope. */
export function connectResultFromSession(session: Session, chainId: Caip2): Caip25ConnectResult {
  const scope = session.scopes[chainId];
  return {
    accounts: (scope?.accounts ?? []).map((account) => ({
      address: accountOf(account) as Address,
      ...(scope?.capabilities ? { capabilities: scope.capabilities } : {}),
    })),
  };
}

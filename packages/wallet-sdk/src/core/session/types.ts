import type { Caip2, Session } from '../../storage/schema.js';
export type { ScopeState, Session } from '../../storage/schema.js';

export type Caip25PrivateScopeParams = [
  {
    version: string;
    [key: string]: unknown;
  },
];

/**
 * CAIP-25 request scope.
 *
 * Scope keys are a CAIP-104 namespace (`eip155`) or a CAIP-2 chain id. This SDK requests
 * the bare namespace, because consent is per account, not per chain.
 * `capabilities` and `params` are Coinbase-private SDK↔SCW request
 * extensions and are not standardized by CAIP-25.
 */
export type Caip25RequestScope = {
  /** Chain references within a namespace-keyed scope. Omitted to request the namespace. */
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

/** Private request fields attached to the scope by this SDK. */
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

/**
 * Nested JSON-RPC body inside CAIP-27 `wallet_invokeMethod` params.
 * Spec: `params` is required and may be empty.
 */
export type Caip27Request = {
  method: string;
  params: readonly unknown[] | object;
};

/**
 * CAIP-27 `wallet_invokeMethod` params (`chainId` + `request`).
 *
 * `sessionId` is included whenever the CAIP-25 response issued one.
 */
export type Caip27Params = {
  chainId: Caip2;
  request: Caip27Request;
  capabilities?: Record<string, unknown>;
  sessionId?: string;
};

export type Caip27Error = {
  code: number;
  message: string;
  data?: unknown;
};

/**
 * Kernel request after the namespace adapter has run.
 *
 * Same shape as CAIP-27 params. Namespace-specific fields stay inside
 * `request.params`; the injected namespace translator interprets them.
 */
export type Envelope = Caip27Params;

export type CreateSessionOptions = {
  scopes: Record<string, Caip25RequestScope>;
  sessionId?: string;
  properties?: Record<string, unknown>;
};

/** One chain a caller needs, optionally with the methods it needs on that chain. */
export type ScopeRequirement =
  | Caip2
  | {
      chainId: Caip2;
      methods?: readonly string[];
    };

/**
 * Namespace-owned policy injected into the chain-neutral invoke kernel.
 *
 * The kernel already validates and unwraps the CAIP-27 envelope. `decodeResult` is only
 * for namespaces whose method results are not JSON-native (Solana bytes); eip155 has
 * nothing to add and supplies `qualify` alone.
 */
export type NamespaceTranslator = {
  qualify(session: Session, envelope: Envelope): Envelope;
  decodeResult?(result: unknown, envelope: Envelope): unknown;
};

import type { Caip2, Session } from '../../storage/schema.js';
export type { ScopeState, Session } from '../../storage/schema.js';

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

export type Caip27Result = {
  method: string;
  result: unknown;
};

export type Caip27Error = {
  code: number;
  message: string;
  data?: unknown;
};

export type Caip27Response =
  | {
      sessionId?: string;
      chainId: Caip2;
      result: Caip27Result;
    }
  | {
      sessionId?: string;
      chainId: Caip2;
      error: Caip27Error;
    };

/**
 * Kernel request after the namespace adapter has run.
 *
 * Same shape as CAIP-27 params. Namespace-specific fields stay inside
 * `request.params`; the injected namespace translator interprets them.
 */
export type Envelope = Caip27Params;

/** Namespace-owned policy injected into the chain-neutral invoke kernel. */
export type NamespaceTranslator = {
  qualify(session: Session, envelope: Envelope): Envelope;
  unwrapResponse(response: unknown, envelope: Envelope): unknown;
};

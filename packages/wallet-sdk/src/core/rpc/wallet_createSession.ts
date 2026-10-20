/** CAIP-25 `wallet_createSession` request. */
export type WalletCreateSessionRequest = {
  method: 'wallet_createSession';
  params: Caip25RequestParams;
};

/** CAIP-25 `wallet_createSession` result. */
export type WalletCreateSessionResult = {
  sessionId: string;
  scopes: Record<string, Caip25ResultScope>;
  properties?: Record<string, unknown>;
};

/**
 * CAIP-25 request scope.
 *
 * Scope keys are a CAIP-104 namespace (`eip155`) or a CAIP-2 chain id. This SDK requests
 * the bare namespace, because consent is per account, not per chain.
 * `capabilities` and `version` carry the `wallet_connect` params; they are Coinbase-private
 * SDK↔SCW request extensions and are not standardized by CAIP-25.
 */
export type Caip25RequestScope = {
  /**
   * Never sent. The SDK requests whole namespaces, and SCW reads a missing chain list as
   * every chain it serves.
   */
  chains?: never;
  accounts?: string[];
  methods: string[];
  notifications: string[];
  /** Coinbase-private SDK↔SCW request extension; not standard CAIP-25. */
  capabilities?: Record<string, unknown>;
  /** Coinbase-private `wallet_connect` params version; not standard CAIP-25. */
  version?: string;
};

/**
 * Standard CAIP-25 result scope, minus `chains`: a grant is per namespace, so a returned chain
 * list is ignored. Result capabilities are standardized; version is not present.
 */
export type Caip25ResultScope = {
  accounts: string[];
  methods: string[];
  notifications: string[];
  /** Capabilities that hold for the whole namespace. */
  capabilities?: Record<string, unknown>;
  /**
   * Coinbase-private: each granted account's answers to the requested capabilities, keyed by
   * the address as it appears in `accounts`. Not standard CAIP-25.
   */
  accountCapabilities?: Record<string, Record<string, unknown>>;
};

export type Caip25RequestParams = {
  sessionId?: string;
  scopes: Record<string, Caip25RequestScope>;
  /** Generic CAIP-25 session metadata; private request extensions do not live here. */
  properties?: Record<string, unknown>;
};

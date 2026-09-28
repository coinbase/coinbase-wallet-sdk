export type Namespace = string;
export type Caip2 = `${string}:${string}`;
export type Caip10 = `${Caip2}:${string}`;

/**
 * One CAIP-25 grant.
 *
 * `accounts` holds raw account addresses, never CAIP-10 ids: CAIP-25 dropped the
 * CAIP-2 prefix from scope accounts, and a null-reference scope has no single chain
 * to qualify them with anyway.
 */
export type ScopeState = {
  accounts: string[];
  methods: string[];
  capabilities?: Record<string, unknown>;
};

/** Persisted CAIP authorization state. Delivery state never belongs here. */
export type Session = {
  sessionId?: string;
  /**
   * Grants keyed by CAIP-104 namespace (`eip155`, `solana`).
   *
   * Consent is per account, not per chain: one `eip155` grant authorizes every EVM
   * chain, and the wallet decides at execution time which it can serve. Which chains
   * those are — and anything else chain-specific — lives in
   * `properties.chainMetadata`, never here.
   */
  namespaces: Record<Namespace, ScopeState>;
  /** Global CAIP-25 session metadata returned by the wallet, including chainMetadata. */
  properties?: Record<string, unknown>;
};

export interface AppMetadata {
  /** Application name. */
  appName: string;
  /** Application logo URL, or null to use the favicon. */
  appLogoUrl: string | null;
  // No chain fields: a session authorizes every EVM chain, the wallet's own catalog in
  // `Session.properties.chainMetadata` says which it can serve, and the provider starts on
  // Ethereum mainnet until `wallet_switchEthereumChain` moves it.
}

export type Attribution =
  | { auto: boolean; dataSuffix?: never }
  | { auto?: never; dataSuffix: `0x${string}` };

export type Preference = {
  /** Optional wallet popup URL override. */
  walletUrl?: string;
  /** Smart-wallet calldata attribution settings. */
  attribution?: Attribution;
  /** Whether functional telemetry is enabled. */
  telemetry?: boolean;
} & Record<string, unknown>;

export type SpendPermission = {
  createdAt?: number;
  permissionHash?: string;
  signature: string;
  chainId?: number;
  permission: {
    account: string;
    spender: string;
    token: string;
    allowance: string;
    period: number;
    start: number;
    end: number;
    salt: string;
    extraData: string;
  };
};

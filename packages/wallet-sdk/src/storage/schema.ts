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
export type NamespaceGrant = {
  accounts: string[];
  methods: string[];
  capabilities?: Record<string, unknown>;
  /** Each account's answers to the capabilities requested at connect, keyed by account. */
  accountCapabilities?: Record<string, Record<string, unknown>>;
};

/** What the wallet knows about one chain it can serve. */
export type ChainMetadata = {
  rpcUrl?: string;
  nativeCurrency?: { name: string; symbol: string; decimal: number };
  capabilities?: Record<string, unknown>;
};

/** Persisted CAIP authorization state. Delivery state never belongs here. */
export type Session = {
  sessionId: string;
  /**
   * Grants keyed by CAIP-104 namespace (`eip155`, `solana`).
   *
   * Consent is per account, not per chain: one `eip155` grant authorizes every EVM
   * chain, and the wallet decides at execution time which it can serve. Which chains
   * those are — and anything else chain-specific — lives in `chainMetadata`, never here.
   */
  namespaces: Record<Namespace, NamespaceGrant>;
  /**
   * The wallet's chain catalog, keyed by CAIP-2: which chains it can serve and what it knows
   * about each. Capability, not authorization. Parsed once where the session enters
   * (`parseChainMetadata`); each namespace parses the keys it reads.
   */
  chainMetadata?: Record<string, ChainMetadata>;
};

export interface AppMetadata {
  /** Application name. */
  appName: string;
  /** Application logo URL, or null to use the favicon. */
  appLogoUrl: string | null;
  // No chain fields: a session authorizes every EVM chain, the wallet's own catalog in
  // `Session.chainMetadata` says which it can serve, and the provider starts on
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

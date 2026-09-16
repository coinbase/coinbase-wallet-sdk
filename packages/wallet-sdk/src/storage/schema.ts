export type Namespace = string;
export type Caip2 = `${string}:${string}`;
export type Caip10 = `${Caip2}:${string}`;

/**
 * One CAIP-25 grant.
 *
 * `accounts` holds CAIP-10 ids under a chain-keyed scope and raw accounts under a
 * namespace-keyed scope, where no single chain qualifies them.
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
   * Grants keyed by namespace (`eip155` — every chain in that namespace) or by exact
   * CAIP-2 chain (`eip155:8453` — that chain only).
   */
  scopes: Record<string, ScopeState>;
  /** Global CAIP-25 session metadata returned by the wallet. */
  properties?: Record<string, unknown>;
};

export interface AppMetadata {
  /** Application name. */
  appName: string;
  /** Application logo URL, or null to use the favicon. */
  appLogoUrl: string | null;
  /**
   * Chain the provider starts on before a session exists.
   *
   * Authorization is per namespace, so this only picks the initial active chain.
   * Defaults to the first `appChainIds` entry, then Ethereum mainnet.
   */
  defaultChainId?: number;
  /**
   * EVM chain IDs the application expects to use.
   *
   * @deprecated Chain access is authorized per namespace, not per chain, and chain
   * metadata comes from the wallet grant. Only the first entry is still read, as a
   * fallback for `defaultChainId`.
   */
  appChainIds: number[];
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

import type { Address, Hex, LocalAccount, OneOf } from 'viem';
import type { WebAuthnAccount } from 'viem/account-abstraction';

export type Namespace = string;
export type Caip2 = `${string}:${string}`;
export type Caip10 = `${Caip2}:${string}`;

export type ScopeState = {
  accounts: Caip10[];
  methods: string[];
  capabilities?: Record<string, unknown>;
};

/** Persisted CAIP authorization state. Delivery state never belongs here. */
export type Session = {
  sessionId?: string;
  scopes: Record<Caip2, ScopeState>;
  /** Global CAIP-25 session metadata returned by the wallet. */
  properties?: Record<string, unknown>;
};

export type OwnerAccount = OneOf<LocalAccount | WebAuthnAccount>;
export type ToOwnerAccountFn = () => Promise<{ account: OwnerAccount | null }>;

export type SubAccount = {
  address: Address;
  factory?: Address;
  factoryData?: Hex;
};

export interface AppMetadata {
  /** Application name. */
  appName: string;
  /** Application logo URL, or null to use the favicon. */
  appLogoUrl: string | null;
  /** EVM chain IDs supported by the application. */
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

export type SubAccountCreationMode = 'on-connect' | 'manual';
export type SubAccountDefaultAccount = 'sub' | 'universal';
export type SubAccountFundingMode = 'spend-permissions' | 'manual';

export type SubAccountOptions = {
  /** When to create a sub-account. */
  creation?: SubAccountCreationMode;
  /** Which account is first when no account is specified. */
  defaultAccount?: SubAccountDefaultAccount;
  /** How sub-account transactions are funded. */
  funding?: SubAccountFundingMode;
  /** Supplies the local owner used for sub-account signing. */
  toOwnerAccount?: ToOwnerAccountFn;
};

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

import type { ToOwnerAccountFn } from ':store/store.js';
import { EventEmitter } from 'eventemitter3';
import { Address, Hex } from 'viem';

export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}

interface ProviderConnectInfo {
  readonly chainId: string;
}

type ProviderEventMap = {
  connect: ProviderConnectInfo;
  disconnect: ProviderRpcError;
  chainChanged: string; // hex string
  accountsChanged: string[];
};

export class ProviderEventEmitter extends EventEmitter<keyof ProviderEventMap> {}

export interface ProviderInterface extends ProviderEventEmitter {
  request(args: RequestArguments): Promise<unknown>;
  disconnect(): Promise<void>;
  emit<K extends keyof ProviderEventMap>(event: K, ...args: [ProviderEventMap[K]]): boolean;
  on<K extends keyof ProviderEventMap>(event: K, listener: (_: ProviderEventMap[K]) => void): this;
}

export type ProviderEventCallback = ProviderInterface['emit'];

export type SpendPermissionConfig = {
  token: Address;
  allowance: Hex;
  period: number;
  salt?: Hex;
  extraData?: Hex;
};

export interface AppMetadata {
  /** Application name */
  appName: string;
  /** Application logo image URL; favicon is used if unspecified */
  appLogoUrl: string | null;
  /** Array of chainIds your dapp supports */
  appChainIds: number[];
}

export type Attribution =
  | {
      auto: boolean;
      dataSuffix?: never;
    }
  | {
      auto?: never;
      dataSuffix: Hex;
    };

export type Preference = {
  /**
   * The URL for the wallet popup.
   * The wallet URL is automatically managed by the SDK. This field should only be used when overriding the default wallet URL with a custom environment is required.
   * @type {string}
   */
  walletUrl?: string;
  /**
   * @param attribution
   * @type {Attribution}
   * @note Smart Wallet only
   * @description This option only applies to Coinbase Smart Wallet. When a valid data suffix is supplied, it is appended to the initCode and executeBatch calldata.
   * If auto is true, the Smart Wallet will generate a deterministic hex suffix from the app's origin.
   */
  attribution?: Attribution;
  /**
   * Whether to enable functional telemetry.
   * @default true
   */
  telemetry?: boolean;
} & Record<string, unknown>;

export type SubAccountCreationMode = 'on-connect' | 'manual';
export type SubAccountDefaultAccount = 'sub' | 'universal';
export type SubAccountFundingMode = 'spend-permissions' | 'manual';

export type SubAccountOptions = {
  /**
   * Controls when sub accounts are created.
   * - 'on-connect': Sub account is automatically created when connecting to the wallet
   * - 'manual': Sub account must be manually created via wallet_addSubAccount
   * @default 'manual'
   */
  creation?: SubAccountCreationMode;
  /**
   * Controls which account is used by default when no account is specified.
   * - 'sub': Sub account is the default (first in accounts list)
   * - 'universal': Universal account is the default (first in accounts list)
   * @default 'universal'
   */
  defaultAccount?: SubAccountDefaultAccount;
  /**
   * Controls how sub accounts are funded.
   * - 'spend-permissions': Routes through global account if no spend permissions exist
   * - 'manual': Direct execution from sub account without automatic fallbacks
   * @default 'spend-permissions'
   */
  funding?: SubAccountFundingMode;
  /**
   * @returns The owner account that will be used to sign the subaccount transactions.
   */
  toOwnerAccount?: ToOwnerAccountFn;
};

export interface ConstructorOptions {
  metadata: AppMetadata;
  preference: Preference;
  paymasterUrls?: Record<number, string>;
}

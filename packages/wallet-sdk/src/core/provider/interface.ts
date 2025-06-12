import { ToOwnerAccountFn } from ':store/store.js';
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

export type SpendLimitConfig = {
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
      dataSuffix: `0x${string}`;
    };

export type Preference = {
  /**
   * The URL for the keys popup.
   * By default, `https://keys.coinbase.com/connect` is used for production. Use `https://keys-dev.coinbase.com/connect` for development environments.
   * @type {string}
   */
  keysUrl?: string;
  /**
   * @param options
   */
  options: 'all' | 'smartWalletOnly' | 'eoaOnly';
  /**
   * @param attribution
   * @type {Attribution}
   * @note Smart Wallet only
   * @description This option only applies to Coinbase Smart Wallet. When a valid data suffix is supplied, it is appended to the initCode and executeBatch calldata.
   * Coinbase Smart Wallet expects a 16 byte hex string. If the data suffix is not a 16 byte hex string, the Smart Wallet will ignore the property. If auto is true,
   * the Smart Wallet will generate a 16 byte hex string from the apps origin.
   */
  attribution?: Attribution;
  /**
   * Whether to enable functional telemetry.
   * @default true
   */
  analytics?: boolean;
} & Record<string, unknown>;

export type SubAccountOptions = {
  /* Automatically create a subaccount for the user and use it for all transactions. */
  enableAutoSubAccounts?: boolean;
  /**
   * @returns The owner account that will be used to sign the subaccount transactions.
   */
  toOwnerAccount?: ToOwnerAccountFn;
  /**
   * Spend limits requested on app connect if a matching existing one does not exist.
   * Only supports native chain tokens currently.
   */
  defaultSpendLimits?: Record<number, SpendLimitConfig[]>;
};

export interface ConstructorOptions {
  metadata: AppMetadata;
  preference: Preference;
  paymasterUrls?: Record<number, string>;
}

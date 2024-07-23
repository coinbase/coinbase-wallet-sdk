import { EventEmitter } from 'eventemitter3';

import type { BaseStorage } from ':util/BaseStorage';

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
  chainChanged: string; // hex string of chainId
  accountsChanged: string[]; // array of accounts
};

export type ProviderEventKey = keyof ProviderEventMap;
export type ProviderEventValue<K extends ProviderEventKey> = ProviderEventMap[K];

export interface ProviderInterface extends EventEmitter {
  request(args: RequestArguments): Promise<unknown>;
  disconnect(): Promise<void>;
  on<K extends ProviderEventKey>(event: K, listener: (_: ProviderEventValue<K>) => void): this;
  on(event: string | symbol, listener: (_: unknown) => void): this; // fallback for other events
}

export interface AppMetadata {
  /** Application name */
  appName: string;
  /** Application logo image URL; favicon is used if unspecified */
  appLogoUrl: string | null;
  /** Array of chainIds your dapp supports */
  appChainIds: number[];
}

export interface Preference {
  options: 'all' | 'smartWalletOnly' | 'eoaOnly';
  keysUrl?: string;
}

export interface ConstructorOptions {
  metadata: AppMetadata;
  preference: Preference;
  baseStorage?: BaseStorage;
}

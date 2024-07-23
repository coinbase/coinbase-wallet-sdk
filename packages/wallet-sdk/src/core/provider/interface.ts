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

export class ProviderEventEmitter extends EventEmitter<keyof ProviderEventMap> {}
export type ProviderEventCallback = ProviderEventEmitter['emit'];

export interface ProviderInterface extends ProviderEventEmitter {
  request(args: RequestArguments): Promise<unknown>;
  disconnect(): Promise<void>;
  on<K extends keyof ProviderEventMap>(event: K, listener: (_: ProviderEventMap[K]) => void): this;
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

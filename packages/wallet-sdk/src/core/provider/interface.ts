import EventEmitter from 'eventemitter3';

import { Method } from './method';

export interface RequestArguments {
  readonly method: Method | string;
  readonly params?: readonly unknown[] | object;
}

export interface ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}

export interface ProviderInterface {
  request<T>(args: RequestArguments): Promise<T>;
  disconnect(): Promise<void>;
  on<T>(event: string, listener: (_: T) => void): EventEmitter;
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
}

import { EventEmitter } from 'eventemitter3';
import { Address, Hex } from 'viem';
import type { AppMetadata, Preference } from '../../storage/schema.js';
import type { RequestArguments } from '../message/RequestArguments.js';
export type {
  AppMetadata,
  Attribution,
  Preference,
} from '../../storage/schema.js';
export type { RequestArguments } from '../message/RequestArguments.js';

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

export interface ConstructorOptions {
  metadata: AppMetadata;
  preference: Preference;
}

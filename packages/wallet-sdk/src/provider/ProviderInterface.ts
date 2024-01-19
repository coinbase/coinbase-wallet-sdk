import { EventEmitter } from 'eventemitter3';

import { Callback } from '../core/type';
import { JSONRPCRequest, JSONRPCResponse } from './JSONRPC';

export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}

interface ProviderMessage {
  type: string;
  data: unknown;
}

interface ProviderConnectInfo {
  readonly chainId: string;
}

// properties explicitly required by EIP-1193 spec
// + extends EventEmitter per spec recomendation
export interface EIP1193RequiredProperties extends EventEmitter {
  request(args: RequestArguments): Promise<unknown>;
  on(event: 'connect', listener: (info: ProviderConnectInfo) => void): this;
  on(event: 'disconnect', listener: (error: ProviderRpcError) => void): this;
  on(event: 'chainChanged', listener: (chainId: string) => void): this;
  on(event: 'accountsChanged', listener: (accounts: string[]) => void): this;
  on(event: 'message', listener: (message: ProviderMessage) => void): this;
}

export interface EIP1193Provider extends EIP1193RequiredProperties {}

export interface CBWSDKProvider extends EIP1193Provider {
  send(request: JSONRPCRequest): JSONRPCResponse;
  send(request: JSONRPCRequest[]): JSONRPCResponse[];
  send(request: JSONRPCRequest, callback: Callback<JSONRPCResponse>): void;
  send(request: JSONRPCRequest[], callback: Callback<JSONRPCResponse[]>): void;
  send<T = unknown>(method: string, params?: unknown[] | unknown): Promise<T>;

  sendAsync(request: JSONRPCRequest, callback: Callback<JSONRPCResponse>): void;
  sendAsync(request: JSONRPCRequest[], callback: Callback<JSONRPCResponse[]>): void;

  request<T>(args: RequestArguments): Promise<T>;

  host: string;
  connected: boolean;
  chainId: string;
  supportsSubscriptions(): boolean;
  disconnect(): boolean;
}

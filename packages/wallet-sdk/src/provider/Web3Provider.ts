// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { Callback } from '../core/type';
import { JSONRPCRequest, JSONRPCResponse } from '../provider/JSONRPC';

export interface Web3Provider {
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

export interface RequestArguments {
  /** The RPC method to request. */
  method: string;

  /** The params of the RPC method, if any. */
  params?: unknown;
}

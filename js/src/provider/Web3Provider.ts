// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { Callback } from "../types"
import { JSONRPCRequest, JSONRPCResponse } from "./JSONRPC"

export interface Web3Provider {
  send(request: JSONRPCRequest): JSONRPCResponse
  send(request: JSONRPCRequest[]): JSONRPCResponse[]
  send(request: JSONRPCRequest, callback: Callback<JSONRPCResponse>): void
  send(request: JSONRPCRequest[], callback: Callback<JSONRPCResponse[]>): void
  send<T = any>(method: string, params?: any[] | any): Promise<T>

  sendAsync(request: JSONRPCRequest, callback: Callback<JSONRPCResponse>): void
  sendAsync(
    request: JSONRPCRequest[],
    callback: Callback<JSONRPCResponse[]>
  ): void

  request<T>(args: RequestArguments): Promise<T>

  host: string
  connected: boolean
  supportsSubscriptions(): boolean
  disconnect(): boolean
}

export enum ProviderErrorCode {
  USER_DENIED_REQUEST_ACCOUNTS = 4001,
  USER_DENIED_CREATE_ACCOUNT = 4010, // unused
  UNAUTHORIZED = 4100,
  UNSUPPORTED_METHOD = 4200,
  USER_DENIED_REQUEST_SIGNATURE = -32603
}

export class ProviderError extends Error {
  constructor(message: string, public code?: number, public data?: any) {
    super(message || "Provider Error")
    this.name = "ProviderError"
    Object.setPrototypeOf(this, ProviderError.prototype)
  }
}

export interface RequestArguments {
  /** The RPC method to request. */
  method: string

  /** The params of the RPC method, if any. */
  params?: any[]
}

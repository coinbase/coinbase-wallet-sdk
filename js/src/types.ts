// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

// tslint:disable:variable-name

interface Tag<T extends string, RealType> {
  __tag__: T
  __realType__: RealType
}

export type OpaqueType<T extends string, U> = U & Tag<T, U>

export function OpaqueType<T extends Tag<any, any>>() {
  return (value: T extends Tag<any, infer U> ? U : never): T => value as T
}

export type HexString = OpaqueType<"HexString", string>
export const HexString = OpaqueType<HexString>()

export type AddressString = OpaqueType<"AddressString", string>
export const AddressString = OpaqueType<AddressString>()

export type IdNumber = OpaqueType<"IdNumber", number>
export const IdNumber = OpaqueType<IdNumber>()

export type BigIntString = OpaqueType<"BigIntString", string>
export const BigIntString = OpaqueType<BigIntString>()

export type IntNumber = OpaqueType<"IntNumber", number>
export const IntNumber = OpaqueType<IntNumber>()

export type RegExpString = OpaqueType<"RegExpString", string>
export const RegExpString = OpaqueType<RegExpString>()

export enum JSONRPCMethod {
  // synchronous or asynchronous
  eth_accounts = "eth_accounts",
  eth_coinbase = "eth_coinbase",
  net_version = "net_version",
  eth_uninstallFilter = "eth_uninstallFilter", // synchronous

  // asynchronous only
  eth_requestAccounts = "eth_requestAccounts",
  eth_sign = "eth_sign",
  eth_ecRecover = "eth_ecRecover",
  personal_sign = "personal_sign",
  personal_ecRecover = "personal_ecRecover",
  eth_signTransaction = "eth_signTransaction",
  eth_sendRawTransaction = "eth_sendRawTransaction",
  eth_sendTransaction = "eth_sendTransaction",
  // TODO: eth_signTypedData = 'eth_signTypedData',

  // asynchronous filter methods
  eth_newFilter = "eth_newFilter",
  eth_newBlockFilter = "eth_newBlockFilter",
  eth_newPendingTransactionFilter = "eth_newPendingTransactionFilter",
  eth_getFilterChanges = "eth_getFilterChanges",
  eth_getFilterLogs = "eth_getFilterLogs"
}

export type Callback<T> = (err: Error | null, result: T | null) => void

export interface JSONRPCRequest<T = any[]> {
  jsonrpc: "2.0"
  id: number
  method: string
  params: T
}

export interface JSONRPCResponse<T = any, U = any> {
  jsonrpc: "2.0"
  id: number
  result?: T
  error?: {
    code: number
    message: string
    data?: U
  } | null
}

export interface Web3Provider {
  send(request: JSONRPCRequest): JSONRPCResponse
  send(request: JSONRPCRequest[]): JSONRPCResponse[]
  send(request: JSONRPCRequest, callback: Callback<JSONRPCResponse>): void
  send(request: JSONRPCRequest[], callback: Callback<JSONRPCResponse[]>): void
  send(method: string, params?: any[] | any): Promise<JSONRPCResponse>

  sendAsync(request: JSONRPCRequest, callback: Callback<JSONRPCResponse>): void
  sendAsync(
    request: JSONRPCRequest[],
    callback: Callback<JSONRPCResponse[]>
  ): void
}

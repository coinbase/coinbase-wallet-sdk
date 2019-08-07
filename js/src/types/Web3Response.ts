// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { AddressString, HexString } from "./common"
import { Web3Method } from "./Web3Method"

interface BaseWeb3Response<Result> {
  method: Web3Method
  errorMessage?: string | null
  result?: Result
}

export interface ErrorResponse extends BaseWeb3Response<void> {
  errorMessage: string
}

export function ErrorResponse(
  method: Web3Method,
  errorMessage: string
): ErrorResponse {
  return { method, errorMessage }
}

export type RequestEthereumAccountsResponse = BaseWeb3Response<
  AddressString[] // an array of ethereum addresses
>

export function RequestEthereumAccountsResponse(
  addresses: AddressString[]
): RequestEthereumAccountsResponse {
  return { method: Web3Method.requestEthereumAccounts, result: addresses }
}

export function isRequestEthereumAccountsResponse(
  res: any
): res is RequestEthereumAccountsResponse {
  return res && res.method === Web3Method.requestEthereumAccounts
}

export type SignEthereumMessageResponse = BaseWeb3Response<
  HexString // signature
>

export type SignEthereumTransactionResponse = BaseWeb3Response<
  HexString // signed transaction
>

export type SubmitEthereumTransactionResponse = BaseWeb3Response<
  HexString // transaction hash
>

export type EthereumAddressFromSignedMessageResponse = BaseWeb3Response<
  AddressString // ethereum address
>

export type ScanQRCodeResponse = BaseWeb3Response<
  string // scanned string
>

export type ArbitraryResponse = BaseWeb3Response<
  string // response data
>

export type Web3Response =
  | ErrorResponse
  | RequestEthereumAccountsResponse
  | SignEthereumMessageResponse
  | SignEthereumTransactionResponse
  | SubmitEthereumTransactionResponse
  | EthereumAddressFromSignedMessageResponse
  | ScanQRCodeResponse
  | ArbitraryResponse

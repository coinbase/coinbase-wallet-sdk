// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { AddressString, HexString } from "./common"

interface BaseWeb3Response<Result> {
  errorMessage?: string | null
  result?: Result
}

export interface ErrorResponse extends BaseWeb3Response<void> {
  errorMessage: string
}

export type RequestEthereumAccountsResponse = BaseWeb3Response<
  AddressString[] // an array of ethereum addresses
>

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

export type Web3Response =
  | ErrorResponse
  | RequestEthereumAccountsResponse
  | SignEthereumMessageResponse
  | SignEthereumTransactionResponse
  | SubmitEthereumTransactionResponse
  | EthereumAddressFromSignedMessageResponse
  | ScanQRCodeResponse

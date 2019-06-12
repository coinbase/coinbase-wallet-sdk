// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { AddressString, HexString } from "./types"

interface BaseWeb3Response<Result> {
  errorMessage?: string | null
  result?: Result
}

export type ErrorResponse = BaseWeb3Response<undefined>

export type RequestEthereumAddressesResponse = BaseWeb3Response<
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
  | RequestEthereumAddressesResponse
  | SignEthereumMessageResponse
  | SignEthereumTransactionResponse
  | SubmitEthereumTransactionResponse
  | EthereumAddressFromSignedMessageResponse
  | ScanQRCodeResponse

export interface Web3ResponseMessage {
  id: string
  response: Web3Response
}

export function isWeb3ResponseMessage(msg: any): msg is Web3ResponseMessage {
  return msg && typeof msg.id === "string" && typeof msg.response === "object"
}

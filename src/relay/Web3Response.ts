// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { AddressString, HexString } from "../types"
import { Web3Method } from "./Web3Method"

interface BaseWeb3Response<Result> {
  method: Web3Method
  errorMessage?: string | null
  result?: Result
}

export interface ErrorResponse extends BaseWeb3Response<void> {
  errorCode?: number
  errorMessage: string
}

export function ErrorResponse(
  method: Web3Method,
  errorMessage: string,
  errorCode?: number
): ErrorResponse {
  return { method, errorMessage, errorCode }
}

export type RequestEthereumAccountsResponse = BaseWeb3Response<
  AddressString[] // an array of ethereum addresses
>

export type AddEthereumChainResponse = BaseWeb3Response<AddResponse> // was request approved

export type AddResponse = {
  isApproved: boolean
  rpcUrl: string
}

export function AddEthereumChainResponse(
  addResponse: AddResponse
): SwitchEthereumChainResponse {
  return {
    method: Web3Method.addEthereumChain,
    result: addResponse
  }
}

export type SwitchEthereumChainResponse = BaseWeb3Response<SwitchResponse> // was request approved

export type SwitchResponse = {
  isApproved: boolean
  rpcUrl: string
}

export function SwitchEthereumChainResponse(
  switchResponse: SwitchResponse
): SwitchEthereumChainResponse {
  return {
    method: Web3Method.switchEthereumChain,
    result: switchResponse
  }
}

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

export function SignEthereumMessageResponse(
  signature: HexString
): SignEthereumMessageResponse {
  return { method: Web3Method.signEthereumMessage, result: signature }
}

export type SignEthereumMessageResponse = BaseWeb3Response<HexString> // signature

export function SignEthereumTransactionResponse(
  signedData: HexString
): SignEthereumTransactionResponse {
  return { method: Web3Method.signEthereumTransaction, result: signedData }
}

export type SignEthereumTransactionResponse = BaseWeb3Response<HexString> // signed transaction

export function SubmitEthereumTransactionResponse(
  txHash: HexString
): SubmitEthereumTransactionResponse {
  return { method: Web3Method.submitEthereumTransaction, result: txHash }
}

export type SubmitEthereumTransactionResponse = BaseWeb3Response<HexString> // transaction hash

export function EthereumAddressFromSignedMessageResponse(
  address: AddressString
): EthereumAddressFromSignedMessageResponse {
  return {
    method: Web3Method.ethereumAddressFromSignedMessage,
    result: address
  }
}

export type EthereumAddressFromSignedMessageResponse =
  BaseWeb3Response<AddressString> // ethereum address

export type ScanQRCodeResponse = BaseWeb3Response<string> // scanned string

export type GenericResponse = BaseWeb3Response<object> // response data

export type MakeEthereumJSONRPCResponse = BaseWeb3Response<unknown>

export type Web3Response =
  | ErrorResponse
  | RequestEthereumAccountsResponse
  | SignEthereumMessageResponse
  | SignEthereumTransactionResponse
  | SubmitEthereumTransactionResponse
  | EthereumAddressFromSignedMessageResponse
  | ScanQRCodeResponse
  | GenericResponse
  | AddEthereumChainResponse
  | SwitchEthereumChainResponse
  | MakeEthereumJSONRPCResponse

// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { AddressString, HexString, IdNumber } from "./types"

interface BaseWalletLinkResponse<Result> {
  errorMessage?: string | null
  result?: Result
}

export type RequestEthereumAddressesResponse = BaseWalletLinkResponse<
  AddressString[] // an array of ethereum addresses
>

export type SignEthereumMessageResponse = BaseWalletLinkResponse<
  HexString // signature
>

export type SignEthereumTransactionResponse = BaseWalletLinkResponse<
  HexString // signed transaction
>

export type SubmitEthereumTransactionResponse = BaseWalletLinkResponse<
  HexString // transaction hash
>

export type EthereumAddressFromSignedMessageResponse = BaseWalletLinkResponse<
  AddressString // ethereum address
>

export type ScanQRCodeResponse = BaseWalletLinkResponse<
  string // scanned string
>

export type WalletLinkResponse =
  | RequestEthereumAddressesResponse
  | SignEthereumMessageResponse
  | SignEthereumTransactionResponse
  | SubmitEthereumTransactionResponse
  | EthereumAddressFromSignedMessageResponse
  | ScanQRCodeResponse

export interface WalletLinkResponseMessage {
  id: IdNumber
  response: WalletLinkResponse
}

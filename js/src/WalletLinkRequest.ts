// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import {
  AddressString,
  BigIntString,
  HexString,
  IdNumber,
  IntNumber,
  RegExpString
} from "./types"
import { WalletLinkMethod } from "./WalletLinkMethod"

interface BaseWalletLinkRequest<
  Method extends WalletLinkMethod,
  Params extends object
> {
  method: Method
  params: Params
}

export type RequestEthereumAddressesRequest = BaseWalletLinkRequest<
  WalletLinkMethod.requestEthereumAddresses,
  {
    appName: string
  }
>

export type SignEthereumMessageRequest = BaseWalletLinkRequest<
  WalletLinkMethod.signEthereumMessage,
  {
    message: HexString
    address: AddressString
    addPrefix: boolean
  }
>

export type SignEthereumTransactionRequest = BaseWalletLinkRequest<
  WalletLinkMethod.signEthereumTransaction,
  {
    fromAddress: AddressString
    toAddress: AddressString | null
    weiValue: BigIntString
    data: HexString
    nonce: IntNumber | null
    gasPriceInWei: BigIntString | null
    gasLimit: BigIntString | null
    chainId: IntNumber
    shouldSubmit: boolean
  }
>

export type SubmitEthereumTransactionRequest = BaseWalletLinkRequest<
  WalletLinkMethod.submitEthereumTransaction,
  {
    signedTransaction: HexString
    chainId: IntNumber
  }
>

export type EthereumAddressFromSignedMessageRequest = BaseWalletLinkRequest<
  WalletLinkMethod.ethereumAddressFromSignedMessage,
  {
    message: HexString
    signature: HexString
    addPrefix: boolean
  }
>

export type ScanQRCodeRequest = BaseWalletLinkRequest<
  WalletLinkMethod.scanQRCode,
  {
    regExp: RegExpString
  }
>

export type WalletLinkRequest =
  | RequestEthereumAddressesRequest
  | SignEthereumMessageRequest
  | SignEthereumTransactionRequest
  | SubmitEthereumTransactionRequest
  | EthereumAddressFromSignedMessageRequest
  | ScanQRCodeRequest

export interface WalletLinkRequestMessage {
  id: IdNumber
  request: WalletLinkRequest
}

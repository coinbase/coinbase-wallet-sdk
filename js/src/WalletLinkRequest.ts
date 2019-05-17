// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import {
  AddressString,
  BigIntString,
  HexString,
  IdNumber,
  IntNumber,
  OpaqueType,
  RegExpString
} from "./types"

interface BaseWalletLinkRequest {
  id: IdNumber
  method: string
  params: {}
}

export interface GetEthereumAddressRequest extends BaseWalletLinkRequest {
  method: "getEthereumAddress"
  params: {
    appName: string
    chainId: IntNumber
  }
}

export interface SignEthereumMessageRequest extends BaseWalletLinkRequest {
  method: "signEthereumMessage"
  params: {
    message: HexString
    address: AddressString
    addPrefix: boolean
  }
}

export interface SignEthereumTransactionRequest extends BaseWalletLinkRequest {
  method: "signEthereumTransaction"
  params: {
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
}

export interface SubmitEthereumTransactionRequest
  extends BaseWalletLinkRequest {
  method: "submitEthereumTransaction"
  params: {
    signedTransaction: HexString
    chainId: IntNumber
  }
}

export interface EthereumAddressFromSignedMessageRequest
  extends BaseWalletLinkRequest {
  method: "ethereumAddressFromSignedMessage"
  params: {
    message: HexString
    signature: HexString
    addPrefix: boolean
  }
}

export interface ScanQRCodeRequest extends BaseWalletLinkRequest {
  method: "scanQRCode"
  params: {
    regExp: RegExpString
  }
}

export type WalletLinkRequest =
  | GetEthereumAddressRequest
  | SignEthereumMessageRequest
  | SignEthereumTransactionRequest
  | SubmitEthereumTransactionRequest
  | EthereumAddressFromSignedMessageRequest
  | ScanQRCodeRequest

export type WalletLinkRequestJson = OpaqueType<"WalletLinkRequestJson", string>
export function WalletLinkRequestJson<T extends WalletLinkRequest>(
  message: T
): WalletLinkRequestJson {
  return JSON.stringify(message) as WalletLinkRequestJson
}

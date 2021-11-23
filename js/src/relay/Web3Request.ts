// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import {
  AddressString,
  BigIntString,
  HexString,
  IntNumber,
  RegExpString
} from "../types"
import { Web3Method } from "./Web3Method"

interface BaseWeb3Request<
  Method extends Web3Method,
  Params extends object = {}
> {
  method: Method
  params: Params
}

export type RequestEthereumAccountsRequest = BaseWeb3Request<
  Web3Method.requestEthereumAccounts,
  {
    appName: string
    appLogoUrl: string | null
  }
>

export type AddEthereumChainRequest = BaseWeb3Request<
  Web3Method.addEthereumChain,
  {
    chainId: string,
    blockExplorerUrls?: string[],
    chainName?: string,
    iconUrls?: string[]
    rpcUrls?: string[],
    nativeCurrency?: {
      name: string;
      symbol: string;
      decimals: number;
    }
  }
>

export type SwitchEthereumChainRequest = BaseWeb3Request<
  Web3Method.switchEthereumChain,
  {
    chainId: string
  }
>

export type SignEthereumMessageRequest = BaseWeb3Request<
  Web3Method.signEthereumMessage,
  {
    message: HexString
    address: AddressString
    addPrefix: boolean
    typedDataJson: string | null
  }
>

export type SignEthereumTransactionRequest = BaseWeb3Request<
  Web3Method.signEthereumTransaction,
  {
    fromAddress: AddressString
    toAddress: AddressString | null
    weiValue: BigIntString
    data: HexString
    nonce: IntNumber | null
    gasPriceInWei: BigIntString | null
    maxFeePerGas: BigIntString | null // in wei
    maxPriorityFeePerGas: BigIntString | null // in wei
    gasLimit: BigIntString | null
    chainId: IntNumber
    shouldSubmit: boolean
  }
>

export type SubmitEthereumTransactionRequest = BaseWeb3Request<
  Web3Method.submitEthereumTransaction,
  {
    signedTransaction: HexString
    chainId: IntNumber
  }
>

export type EthereumAddressFromSignedMessageRequest = BaseWeb3Request<
  Web3Method.ethereumAddressFromSignedMessage,
  {
    message: HexString
    signature: HexString
    addPrefix: boolean
  }
>

export type ScanQRCodeRequest = BaseWeb3Request<
  Web3Method.scanQRCode,
  {
    regExp: RegExpString
  }
>

export type GenericRequest = BaseWeb3Request<
  Web3Method.generic,
  {
    action: string
    data: object
  }
>

export type Web3Request =
  | RequestEthereumAccountsRequest
  | SignEthereumMessageRequest
  | SignEthereumTransactionRequest
  | SubmitEthereumTransactionRequest
  | EthereumAddressFromSignedMessageRequest
  | ScanQRCodeRequest
  | GenericRequest
  | AddEthereumChainRequest
  | SwitchEthereumChainRequest

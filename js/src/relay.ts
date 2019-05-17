// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import BN from "bn.js"
import { AddressString, IdNumber, IntNumber, RegExpString } from "./types"
import { bigIntStringFromBN, hexStringFromBuffer } from "./util"
import {
  EthereumAddressFromSignedMessageRequest,
  GetEthereumAddressRequest,
  ScanQRCodeRequest,
  SignEthereumMessageRequest,
  SignEthereumTransactionRequest,
  SubmitEthereumTransactionRequest,
  WalletLinkRequestJson
} from "./WalletLinkRequest"

export interface EthereumTransactionParams {
  id: IdNumber
  fromAddress: AddressString
  toAddress: AddressString | null
  weiValue: BN
  data: Buffer
  nonce: IntNumber | null
  gasPriceInWei: BN | null
  gasLimit: BN | null
  chainId: IntNumber
}

declare global {
  interface Window {
    __CIPHER_BRIDGE__?: {
      postMessage(message: WalletLinkRequestJson): void
    }
    webkit?: {
      messageHandlers?: {
        cipher?: {
          postMessage(message: WalletLinkRequestJson): void
        }
      }
    }
  }
}

export function getEthereumAddress(
  id: IdNumber,
  appName: string,
  chainId: IntNumber
): void {
  postMessage(
    WalletLinkRequestJson<GetEthereumAddressRequest>({
      id,
      method: "getEthereumAddress",
      params: {
        appName,
        chainId
      }
    })
  )
}

export function signEthereumMessage(
  id: IdNumber,
  message: Buffer,
  address: AddressString,
  addPrefix: boolean
): void {
  postMessage(
    WalletLinkRequestJson<SignEthereumMessageRequest>({
      id,
      method: "signEthereumMessage",
      params: {
        message: hexStringFromBuffer(message, true),
        address,
        addPrefix
      }
    })
  )
}

export function ethereumAddressFromSignedMessage(
  id: IdNumber,
  message: Buffer,
  signature: Buffer,
  addPrefix: boolean
): void {
  postMessage(
    WalletLinkRequestJson<EthereumAddressFromSignedMessageRequest>({
      id,
      method: "ethereumAddressFromSignedMessage",
      params: {
        message: hexStringFromBuffer(message, true),
        signature: hexStringFromBuffer(signature, true),
        addPrefix
      }
    })
  )
}

export function signEthereumTransaction(
  params: EthereumTransactionParams
): void {
  postMessage(
    WalletLinkRequestJson<SignEthereumTransactionRequest>({
      id: params.id,
      method: "signEthereumTransaction",
      params: {
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        weiValue: bigIntStringFromBN(params.weiValue),
        data: hexStringFromBuffer(params.data, true),
        nonce: params.nonce,
        gasPriceInWei: params.gasPriceInWei
          ? bigIntStringFromBN(params.gasPriceInWei)
          : null,
        gasLimit: params.gasLimit ? bigIntStringFromBN(params.gasLimit) : null,
        chainId: params.chainId,
        shouldSubmit: false
      }
    })
  )
}

export function signAndSubmitEthereumTransaction(
  params: EthereumTransactionParams
): void {
  postMessage(
    WalletLinkRequestJson<SignEthereumTransactionRequest>({
      id: params.id,
      method: "signEthereumTransaction",
      params: {
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        weiValue: bigIntStringFromBN(params.weiValue),
        data: hexStringFromBuffer(params.data, true),
        nonce: params.nonce,
        gasPriceInWei: params.gasPriceInWei
          ? bigIntStringFromBN(params.gasPriceInWei)
          : null,
        gasLimit: params.gasLimit ? bigIntStringFromBN(params.gasLimit) : null,
        chainId: params.chainId,
        shouldSubmit: true
      }
    })
  )
}

export function submitEthereumTransaction(
  id: IdNumber,
  signedTransaction: Buffer,
  chainId: IntNumber
): void {
  postMessage(
    WalletLinkRequestJson<SubmitEthereumTransactionRequest>({
      id,
      method: "submitEthereumTransaction",
      params: {
        signedTransaction: hexStringFromBuffer(signedTransaction, true),
        chainId
      }
    })
  )
}

export function scanQRCode(id: IdNumber, regExp: RegExpString): void {
  postMessage(
    WalletLinkRequestJson<ScanQRCodeRequest>({
      id,
      method: "scanQRCode",
      params: { regExp }
    })
  )
}

function postMessage(message: WalletLinkRequestJson): void {
  if (window.__CIPHER_BRIDGE__) {
    window.__CIPHER_BRIDGE__.postMessage(message)
  } else if (
    window.webkit &&
    window.webkit.messageHandlers &&
    window.webkit.messageHandlers.cipher
  ) {
    window.webkit.messageHandlers.cipher.postMessage(message)
  }
}

// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import BN from "bn.js"
import url from "url"
import { AddressString, IdNumber, IntNumber, RegExpString } from "./types"
import { bigIntStringFromBN, hexStringFromBuffer } from "./util"
import { WalletLinkMethod } from "./WalletLinkMethod"
import {
  WalletLinkRequest,
  WalletLinkRequestMessage
} from "./WalletLinkRequest"
import {
  EthereumAddressFromSignedMessageResponse,
  RequestEthereumAddressesResponse,
  ScanQRCodeResponse,
  SignEthereumMessageResponse,
  SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse,
  WalletLinkResponse
} from "./WalletLinkResponse"

export interface EthereumTransactionParams {
  fromAddress: AddressString
  toAddress: AddressString | null
  weiValue: BN
  data: Buffer
  nonce: IntNumber | null
  gasPriceInWei: BN | null
  gasLimit: BN | null
  chainId: IntNumber
}

type ResponseCallback = (response: WalletLinkResponse) => void

export class WalletLinkRelay {
  private static _nextId = IdNumber(0)
  private static _callbacks = new Map<IdNumber, ResponseCallback>()

  private _walletLinkWebUrl: string
  private _iframe: HTMLIFrameElement | null = null

  constructor(walletLinkWebUrl: string) {
    this._walletLinkWebUrl = walletLinkWebUrl
  }

  public injectIframe(): void {
    if (this._iframe) {
      throw new Error("iframe already injected!")
    }
    const iframe = (this._iframe = document.createElement("iframe"))
    iframe.className = "__WalletLink__"
    iframe.src = `${this._walletLinkWebUrl}/#/bridge`
    iframe.width = "1"
    iframe.height = "1"
    iframe.style.opacity = "0"
    iframe.style.pointerEvents = "none"
    iframe.style.position = "absolute"
    iframe.style.top = "0"
    iframe.style.right = "0"

    const inject = () => {
      const parentEl = document.body || document.documentElement
      parentEl.appendChild(iframe)
    }

    if (["complete", "interactive"].includes(document.readyState)) {
      inject()
    } else {
      window.addEventListener("load", inject, false)
    }
  }

  private static _makeId(): IdNumber {
    // max nextId == max int32 for compatibility with mobile
    const id = (this._nextId = IdNumber((this._nextId + 1) % 0x7fffffff))
    // unlikely that this will ever be an issue, but just to be safe
    const callback = this._callbacks.get(id)
    if (callback) {
      this._callbacks.delete(id)
      callback({ errorMessage: "callback expired" })
    }
    return id
  }

  public requestEthereumAccounts(
    appName: string
  ): Promise<RequestEthereumAddressesResponse> {
    return this.sendRequest({
      method: WalletLinkMethod.requestEthereumAddresses,
      params: {
        appName
      }
    })
  }

  public signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean
  ): Promise<SignEthereumMessageResponse> {
    return this.sendRequest({
      method: WalletLinkMethod.signEthereumMessage,
      params: {
        message: hexStringFromBuffer(message, true),
        address,
        addPrefix
      }
    })
  }

  public ethereumAddressFromSignedMessage(
    message: Buffer,
    signature: Buffer,
    addPrefix: boolean
  ): Promise<EthereumAddressFromSignedMessageResponse> {
    return this.sendRequest({
      method: WalletLinkMethod.ethereumAddressFromSignedMessage,
      params: {
        message: hexStringFromBuffer(message, true),
        signature: hexStringFromBuffer(signature, true),
        addPrefix
      }
    })
  }

  public signEthereumTransaction(
    params: EthereumTransactionParams
  ): Promise<SignEthereumTransactionResponse> {
    return this.sendRequest({
      method: WalletLinkMethod.signEthereumTransaction,
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
  }

  public signAndSubmitEthereumTransaction(
    params: EthereumTransactionParams
  ): Promise<SubmitEthereumTransactionResponse> {
    return this.sendRequest({
      method: WalletLinkMethod.signEthereumTransaction,
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
  }

  public submitEthereumTransaction(
    signedTransaction: Buffer,
    chainId: IntNumber
  ): Promise<SubmitEthereumTransactionResponse> {
    return this.sendRequest({
      method: WalletLinkMethod.submitEthereumTransaction,
      params: {
        signedTransaction: hexStringFromBuffer(signedTransaction, true),
        chainId
      }
    })
  }

  public scanQRCode(regExp: RegExpString): Promise<ScanQRCodeResponse> {
    return this.sendRequest({
      method: WalletLinkMethod.scanQRCode,
      params: { regExp }
    })
  }

  public sendRequest<T extends WalletLinkRequest, U extends WalletLinkResponse>(
    request: T
  ): Promise<U> {
    return new Promise((resolve, reject) => {
      if (!this._iframe || !this._iframe.contentWindow) {
        return reject("iframe is not initialized")
      }

      const u = url.parse(this._walletLinkWebUrl)
      const targetOrigin = `${u.protocol}//${u.host}`

      const id = WalletLinkRelay._makeId()

      WalletLinkRelay._callbacks.set(id, response => {
        if (response.errorMessage) {
          return reject(new Error(response.errorMessage))
        }
        resolve(response as U)
      })

      const message: WalletLinkRequestMessage = { id, request }
      this._iframe.contentWindow.postMessage(message, targetOrigin)
    })
  }
}

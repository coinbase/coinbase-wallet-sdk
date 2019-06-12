// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import BN from "bn.js"
import crypto from "crypto"
import url from "url"
import { AddressString, IntNumber, RegExpString } from "./types"
import { bigIntStringFromBN, hexStringFromBuffer } from "./util"
import { WalletLinkNotification } from "./WalletLinkNotification"
import * as walletLinkStorage from "./walletLinkStorage"
import { Web3Method } from "./Web3Method"
import {
  EthereumAddressFromSignedMessageRequest,
  RequestEthereumAddressesRequest,
  ScanQRCodeRequest,
  SignEthereumMessageRequest,
  SignEthereumTransactionRequest,
  SubmitEthereumTransactionRequest,
  Web3Request,
  Web3RequestMessage
} from "./Web3Request"
import {
  EthereumAddressFromSignedMessageResponse,
  isWeb3ResponseMessage,
  RequestEthereumAddressesResponse,
  ScanQRCodeResponse,
  SignEthereumMessageResponse,
  SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse,
  Web3Response,
  Web3ResponseMessage
} from "./Web3Response"

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

type ResponseCallback = (response: Web3Response) => void

export class WalletLinkRelay {
  private static _callbacks = new Map<string, ResponseCallback>()

  private readonly _walletLinkWebUrl: string
  private readonly _walletLinkWebOrigin: string

  private _iframe: HTMLIFrameElement | null = null
  private _walletLinkWindow: Window | null = null

  private _linked = false

  constructor(walletLinkWebUrl: string) {
    this._walletLinkWebUrl = walletLinkWebUrl

    const u = url.parse(this._walletLinkWebUrl)
    this._walletLinkWebOrigin = `${u.protocol}//${u.host}`
  }

  public injectIframe(): void {
    if (this._iframe) {
      throw new Error("iframe already injected!")
    }
    const iframe = document.createElement("iframe")
    iframe.className = "_WalletLinkBridge"
    iframe.src = `${this._walletLinkWebUrl}/#/bridge`
    iframe.width = "1"
    iframe.height = "1"
    iframe.style.opacity = "0"
    iframe.style.pointerEvents = "none"
    iframe.style.position = "absolute"
    iframe.style.top = "0"
    iframe.style.right = "0"
    this._iframe = iframe
    document.documentElement.appendChild(iframe)

    window.addEventListener("message", this._handleMessage, false)
  }

  public requestEthereumAccounts(
    appName: string,
    appLogoUrl: string | null
  ): Promise<RequestEthereumAddressesResponse> {
    return this.sendRequest<
      RequestEthereumAddressesRequest,
      RequestEthereumAddressesResponse
    >({
      method: Web3Method.requestEthereumAddresses,
      params: {
        appName,
        appLogoUrl: appLogoUrl || this._getFavicon()
      }
    })
  }

  public signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean
  ): Promise<SignEthereumMessageResponse> {
    return this.sendRequest<
      SignEthereumMessageRequest,
      SignEthereumMessageResponse
    >({
      method: Web3Method.signEthereumMessage,
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
    return this.sendRequest<
      EthereumAddressFromSignedMessageRequest,
      EthereumAddressFromSignedMessageResponse
    >({
      method: Web3Method.ethereumAddressFromSignedMessage,
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
    return this.sendRequest<
      SignEthereumTransactionRequest,
      SignEthereumTransactionResponse
    >({
      method: Web3Method.signEthereumTransaction,
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
    return this.sendRequest<
      SignEthereumTransactionRequest,
      SubmitEthereumTransactionResponse
    >({
      method: Web3Method.signEthereumTransaction,
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
    return this.sendRequest<
      SubmitEthereumTransactionRequest,
      SubmitEthereumTransactionResponse
    >({
      method: Web3Method.submitEthereumTransaction,
      params: {
        signedTransaction: hexStringFromBuffer(signedTransaction, true),
        chainId
      }
    })
  }

  public scanQRCode(regExp: RegExpString): Promise<ScanQRCodeResponse> {
    return this.sendRequest<ScanQRCodeRequest, ScanQRCodeResponse>({
      method: Web3Method.scanQRCode,
      params: { regExp }
    })
  }

  public sendRequest<T extends Web3Request, U extends Web3Response>(
    request: T
  ): Promise<U> {
    return new Promise((resolve, reject) => {
      if (!this._iframe || !this._iframe.contentWindow) {
        return reject("iframe is not initialized")
      }
      const id = crypto.randomBytes(8).toString("hex")

      let notificationMessage: string

      if (request.method === Web3Method.requestEthereumAddresses) {
        notificationMessage = "Requested access to your account..."
        if (!this._linked) {
          this._openWalletLinkWindow()
        }
      } else {
        notificationMessage = "Pushed a WalletLink request to your device..."
      }

      const notification = new WalletLinkNotification({
        message: notificationMessage,
        onClickCancel: () => {
          this._invokeCallback({
            id,
            response: { errorMessage: "User rejected request" }
          })
        },
        onClickHelp: () => {
          this._openWalletLinkWindow()
        }
      })

      WalletLinkRelay._callbacks.set(id, response => {
        this._closeWalletLinkWindow()
        notification.hide()
        if (response.errorMessage) {
          return reject(new Error(response.errorMessage))
        }
        resolve(response as U)
      })

      const message: Web3RequestMessage = { id, request }
      this._iframe.contentWindow.postMessage(message, this._walletLinkWebOrigin)
      notification.show()
    })
  }

  private _openWalletLinkWindow(): void {
    if (this._walletLinkWindow && this._walletLinkWindow.opener) {
      this._walletLinkWindow.focus()
      return
    }
    const width = 320
    const height = 500
    const left = Math.floor(window.outerWidth / 2 - width / 2 + window.screenX)
    const top = Math.floor(window.outerHeight / 2 - height / 2 + window.screenY)

    this._walletLinkWindow = window.open(
      `${this._walletLinkWebUrl}/#/link`,
      "_blank",
      [
        `width=${width}`,
        `height=${height}`,
        `left=${left}`,
        `top=${top}`,
        "location=yes",
        "menubar=no",
        "resizable=no",
        "status=no",
        "titlebar=yes",
        "toolbar=no"
      ].join(",")
    )
  }

  private _closeWalletLinkWindow(): void {
    if (this._walletLinkWindow) {
      this._walletLinkWindow.close()
      this._walletLinkWindow = null
    }
    window.focus()
  }

  private _getFavicon(): string | null {
    const el =
      document.querySelector('link[sizes="192x192"]') ||
      document.querySelector('link[sizes="180x180"]') ||
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]')

    const { protocol, host } = document.location
    const href = el ? el.getAttribute("href") : null
    if (!href || href.startsWith("javascript:")) {
      return null
    }
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("data:")
    ) {
      return href
    }
    if (href.startsWith("//")) {
      return protocol + href
    }
    return `${protocol}//${host}${href}`
  }

  private _invokeCallback(message: Web3ResponseMessage) {
    const callback = WalletLinkRelay._callbacks.get(message.id)
    if (callback) {
      callback(message.response)
      WalletLinkRelay._callbacks.delete(message.id)
    }
  }

  @bind
  private _handleMessage(evt: MessageEvent): void {
    if (evt.origin !== this._walletLinkWebOrigin) {
      return
    }

    switch (evt.data) {
      case "WALLETLINK_LINKED": {
        this._linked = true
        return
      }

      case "WALLETLINK_UNLINKED": {
        this._linked = false
        walletLinkStorage.clear()
        document.location.reload()
        return
      }
    }

    if (isWeb3ResponseMessage(evt.data)) {
      this._invokeCallback(evt.data)
    }
  }
}

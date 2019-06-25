// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import BN from "bn.js"
import crypto from "crypto"
import querystring from "querystring"
import url from "url"
import { AddressString, IntNumber, RegExpString } from "./types/common"
import { IPCMessage } from "./types/IPCMessage"
import { isLinkedMessage } from "./types/LinkedMessage"
import { isUnlinkedMessage } from "./types/UnlinkedMessage"
import { Web3AccountsRequestMessage } from "./types/Web3AccountsRequestMessage"
import { isWeb3AccountsResponseMessage } from "./types/Web3AccountsResponseMessage"
import {
  EthereumAddressFromSignedMessageRequest,
  RequestEthereumAccountsRequest,
  ScanQRCodeRequest,
  SignEthereumMessageRequest,
  SignEthereumTransactionRequest,
  SubmitEthereumTransactionRequest,
  Web3Method,
  Web3Request
} from "./types/Web3Request"
import { Web3RequestMessage } from "./types/Web3RequestMessage"
import {
  ErrorResponse,
  EthereumAddressFromSignedMessageResponse,
  RequestEthereumAccountsResponse,
  ScanQRCodeResponse,
  SignEthereumMessageResponse,
  SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse,
  Web3Response
} from "./types/Web3Response"
import {
  isWeb3ResponseMessage,
  Web3ResponseMessage
} from "./types/Web3ResponseMessage"
import { bigIntStringFromBN, hexStringFromBuffer } from "./util"
import { WalletLinkNotification } from "./WalletLinkNotification"

const AUTHORIZE_TIMEOUT = 500

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

export interface WalletLinkRelayOptions {
  walletLinkWebUrl: string
  appName: string
  appLogoUrl: string
}

export class WalletLinkRelay {
  private static callbacks = new Map<string, ResponseCallback>()
  private static accountRequestCallbackIds = new Set<string>()

  private readonly walletLinkWebUrl: string
  private readonly walletLinkWebOrigin: string
  private readonly appName: string
  private readonly appLogoUrl: string

  private iframeEl: HTMLIFrameElement | null = null
  private popupWindow: Window | null = null
  private authorizeWindowTimer: number | null = null

  private linked = false

  constructor(options: Readonly<WalletLinkRelayOptions>) {
    this.walletLinkWebUrl = options.walletLinkWebUrl
    this.appName = options.appName
    this.appLogoUrl = options.appLogoUrl

    const u = url.parse(this.walletLinkWebUrl)
    this.walletLinkWebOrigin = `${u.protocol}//${u.host}`
  }

  public injectIframe(): void {
    if (this.iframeEl) {
      throw new Error("iframe already injected!")
    }
    const iframeEl = document.createElement("iframe")
    iframeEl.className = "_WalletLinkBridge"
    iframeEl.src = `${this.walletLinkWebUrl}/#/bridge`
    iframeEl.width = "1"
    iframeEl.height = "1"
    iframeEl.style.opacity = "0"
    iframeEl.style.pointerEvents = "none"
    iframeEl.style.position = "absolute"
    iframeEl.style.top = "0"
    iframeEl.style.right = "0"
    this.iframeEl = iframeEl
    document.documentElement.appendChild(iframeEl)

    window.addEventListener("message", this.handleMessage, false)
  }

  public requestEthereumAccounts(): Promise<RequestEthereumAccountsResponse> {
    return this.sendRequest<
      RequestEthereumAccountsRequest,
      RequestEthereumAccountsResponse
    >({
      method: Web3Method.requestEthereumAccounts,
      params: {}
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
      if (!this.iframeEl || !this.iframeEl.contentWindow) {
        return reject("iframe is not initialized")
      }
      const id = crypto.randomBytes(8).toString("hex")

      const isRequestEthereumAccounts =
        request.method === Web3Method.requestEthereumAccounts

      const notification = new WalletLinkNotification({
        message: isRequestEthereumAccounts
          ? "Requested access to your account..."
          : "Pushed a WalletLink request to your device...",
        onClickCancel: () => {
          this.invokeCallback(
            Web3ResponseMessage({
              id,
              response: { errorMessage: "User rejected request" }
            })
          )
        },
        onClickHelp: () => {
          this.openLinkWindow()
        }
      })
      notification.show()

      WalletLinkRelay.callbacks.set(id, response => {
        this.closePopupWindow()
        notification.hide()
        if (response.errorMessage) {
          return reject(new Error(response.errorMessage))
        }
        resolve(response as U)
      })

      if (isRequestEthereumAccounts) {
        if (this.linked) {
          this.requestAccounts()
        } else {
          this.openLinkWindow()
        }

        WalletLinkRelay.accountRequestCallbackIds.add(id)
        return
      }

      this.postIPCMessage(Web3RequestMessage({ id, request }))
    })
  }

  private postIPCMessage(message: IPCMessage): void {
    if (!this.iframeEl || !this.iframeEl.contentWindow) {
      throw new Error("WalletLink iframe is not initialized")
    }
    this.iframeEl.contentWindow.postMessage(message, this.walletLinkWebOrigin)
  }

  private openLinkWindow(): void {
    this.openPopupWindow("/link")
  }

  private requestAccounts(): void {
    if (this.authorizeWindowTimer === null) {
      this.authorizeWindowTimer = window.setTimeout(() => {
        this.openPopupWindow("/authorize")
        this.authorizeWindowTimer = null
      }, AUTHORIZE_TIMEOUT)
    }

    this.postIPCMessage(Web3AccountsRequestMessage())
  }

  private openPopupWindow(path: string): void {
    if (this.popupWindow && this.popupWindow.opener) {
      this.popupWindow.focus()
      return
    }
    const width = 320
    const height = 500
    const left = Math.floor(window.outerWidth / 2 - width / 2 + window.screenX)
    const top = Math.floor(window.outerHeight / 2 - height / 2 + window.screenY)

    const query = querystring.stringify({
      appName: this.appName,
      appLogoUrl: this.appLogoUrl,
      origin: document.location.origin
    })

    this.popupWindow = window.open(
      `${this.walletLinkWebUrl}/#${path}?${query}`,
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

  private closePopupWindow(): void {
    if (this.popupWindow) {
      this.popupWindow.close()
      this.popupWindow = null
    }
    window.focus()
  }

  private invokeCallback(message: Web3ResponseMessage) {
    const callback = WalletLinkRelay.callbacks.get(message.id)
    if (callback) {
      callback(message.response)
      WalletLinkRelay.callbacks.delete(message.id)
    }
  }

  @bind
  private handleMessage(evt: MessageEvent): void {
    if (evt.origin !== this.walletLinkWebOrigin) {
      return
    }

    const message: unknown = evt.data

    if (isLinkedMessage(message)) {
      this.linked = true
      return
    }

    if (isUnlinkedMessage(message)) {
      this.linked = false
      document.location.reload()
      return
    }

    if (isWeb3AccountsResponseMessage(message)) {
      const addresses = message.addresses as AddressString[]
      const response =
        addresses.length > 0
          ? RequestEthereumAccountsResponse(addresses)
          : ErrorResponse("User denied account authorization")

      Array.from(WalletLinkRelay.accountRequestCallbackIds.values()).forEach(
        id => {
          this.invokeCallback(Web3ResponseMessage({ id, response }))
        }
      )
      WalletLinkRelay.accountRequestCallbackIds.clear()

      // prevent authorize window from appearing
      if (this.authorizeWindowTimer !== null) {
        window.clearTimeout(this.authorizeWindowTimer)
        this.authorizeWindowTimer = null
      }
      return
    }

    if (isWeb3ResponseMessage(message)) {
      this.invokeCallback(message)
    }
  }
}

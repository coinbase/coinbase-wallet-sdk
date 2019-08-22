// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import BN from "bn.js"
import crypto from "crypto"
import url from "url"
import { ScopedLocalStorage } from "./ScopedLocalStorage"
import { AddressString, IntNumber, RegExpString } from "./types/common"
import { IPCMessage } from "./types/IPCMessage"
import { isLinkedMessage } from "./types/LinkedMessage"
import { isLocalStorageBlockedMessage } from "./types/LocalStorageBlockedMessage"
import { SessionIdRequestMessage } from "./types/SessionIdRequestMessage"
import { isSessionIdResponseMessage } from "./types/SessionIdResponseMessage"
import { isUnlinkedMessage } from "./types/UnlinkedMessage"
import { Web3Method } from "./types/Web3Method"
import {
  ArbitraryRequest,
  EthereumAddressFromSignedMessageRequest,
  RequestEthereumAccountsRequest,
  ScanQRCodeRequest,
  SignEthereumMessageRequest,
  SignEthereumTransactionRequest,
  SubmitEthereumTransactionRequest,
  Web3Request
} from "./types/Web3Request"
import { Web3RequestCanceledMessage } from "./types/Web3RequestCanceledMessage"
import { Web3RequestMessage } from "./types/Web3RequestMessage"
import {
  ArbitraryResponse,
  ErrorResponse,
  EthereumAddressFromSignedMessageResponse,
  isRequestEthereumAccountsResponse,
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
import * as walletLinkBlockedDialog from "./walletLinkBlockedDialog"
import {
  WalletLinkNotification,
  WalletLinkNotificationOptions
} from "./WalletLinkNotification"

const LOCAL_STORAGE_SESSION_ID_KEY = "SessionId"

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
  walletLinkUrl: string
}

const BLOCKED_LOCAL_STORAGE_ERROR_MESSAGE =
  "Browser is blocking third-party localStorage usage. To continue, " +
  "turn off third-party storage blocking or whitelist WalletLink."

export class WalletLinkRelay {
  private static callbacks = new Map<string, ResponseCallback>()
  private static accountRequestCallbackIds = new Set<string>()

  private readonly walletLinkUrl: string
  private readonly walletLinkOrigin: string
  private readonly storage: ScopedLocalStorage

  private iframeEl: HTMLIFrameElement | null = null
  private popupUrl: string | null = null
  private popupWindow: Window | null = null
  private sessionId: string | null = null

  private appName = ""
  private appLogoUrl: string | null = null
  private linked = false
  private iframeLoaded = false
  private localStorageBlocked = false
  private actionsPendingIframeLoad: Array<() => void> = []
  private actionsPendingSessionId: Array<() => void> = []

  constructor(options: Readonly<WalletLinkRelayOptions>) {
    this.walletLinkUrl = options.walletLinkUrl

    const u = url.parse(this.walletLinkUrl)
    this.walletLinkOrigin = `${u.protocol}//${u.host}`
    this.storage = new ScopedLocalStorage(
      `__WalletLink__:${this.walletLinkOrigin}`
    )

    this.sessionId = this.getStorageItem(LOCAL_STORAGE_SESSION_ID_KEY) || null
  }

  public setAppInfo(appName: string, appLogoUrl: string | null): void {
    this.appName = appName
    this.appLogoUrl = appLogoUrl
  }

  public injectIframe(): void {
    if (this.iframeEl) {
      throw new Error("iframe already injected!")
    }

    const iframeEl = document.createElement("iframe")
    iframeEl.className = "_WalletLinkBridge"
    iframeEl.width = "1"
    iframeEl.height = "1"
    iframeEl.style.opacity = "0"
    iframeEl.style.pointerEvents = "none"
    iframeEl.style.position = "absolute"
    iframeEl.style.top = "0"
    iframeEl.style.right = "0"
    iframeEl.setAttribute(
      "sandbox",
      "allow-scripts allow-popups allow-same-origin"
    )
    iframeEl.src = `${this.walletLinkUrl}/#/bridge`
    this.iframeEl = iframeEl

    window.addEventListener("message", this.handleMessage, false)
    window.addEventListener("beforeunload", this.handleBeforeUnload, false)

    const onIframeLoad = () => {
      this.iframeLoaded = true
      iframeEl.removeEventListener("load", onIframeLoad, false)
      this.postIPCMessage(SessionIdRequestMessage())
      this.actionsPendingIframeLoad.forEach(action => action())
      this.actionsPendingIframeLoad = []
    }
    iframeEl.addEventListener("load", onIframeLoad, false)

    document.documentElement.appendChild(iframeEl)
  }

  public getStorageItem(key: string): string | null {
    return this.storage.getItem(key)
  }

  public setStorageItem(key: string, value: string): void {
    this.storage.setItem(key, value)
  }

  public requestEthereumAccounts(): Promise<RequestEthereumAccountsResponse> {
    return this.sendRequest<
      RequestEthereumAccountsRequest,
      RequestEthereumAccountsResponse
    >({
      method: Web3Method.requestEthereumAccounts,
      params: {
        appName: this.appName,
        appLogoUrl: this.appLogoUrl || null
      }
    })
  }

  public signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean,
    typedDataJson?: string | null
  ): Promise<SignEthereumMessageResponse> {
    return this.sendRequest<
      SignEthereumMessageRequest,
      SignEthereumMessageResponse
    >({
      method: Web3Method.signEthereumMessage,
      params: {
        message: hexStringFromBuffer(message, true),
        address,
        addPrefix,
        typedDataJson: typedDataJson || null
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

  public arbitraryRequest(data: string): Promise<ArbitraryResponse> {
    return this.sendRequest<ArbitraryRequest, ArbitraryResponse>({
      method: Web3Method.arbitrary,
      params: { data }
    })
  }

  public sendRequest<T extends Web3Request, U extends Web3Response>(
    request: T
  ): Promise<U> {
    if (this.localStorageBlocked) {
      walletLinkBlockedDialog.show()
      return Promise.reject(new Error(BLOCKED_LOCAL_STORAGE_ERROR_MESSAGE))
    }
    return new Promise((resolve, reject) => {
      if (!this.iframeEl || !this.iframeEl.contentWindow) {
        return reject("iframe is not initialized")
      }
      const id = crypto.randomBytes(8).toString("hex")

      const cancel = () => {
        this.postIPCMessage(Web3RequestCanceledMessage(id))
        this.invokeCallback(
          Web3ResponseMessage({
            id,
            response: ErrorResponse(request.method, "User rejected request")
          })
        )
        if (notification) {
          notification.hide()
        }
      }

      const reset = () => {
        this.openPopupWindow("/reset")
        if (notification) {
          notification.hide()
        }
      }

      const options: WalletLinkNotificationOptions = {
        showProgressBar: true,
        autoExpandAfter: 10000,
        buttonInfo2: "Made a mistake?",
        buttonLabel2: "Cancel",
        onClickButton2: cancel
      }

      const isRequestAccounts =
        request.method === Web3Method.requestEthereumAccounts

      if (!this.linked && isRequestAccounts) {
        const showPopup = () => {
          this.openPopupWindow(`/link?id=${this.sessionId}`)
        }
        showPopup()

        options.message = "Requesting to connect to your wallet..."
        options.buttonInfo1 = "Don’t see the popup?"
        options.buttonLabel1 = "Show window"
        options.onClickButton1 = showPopup
      } else {
        options.message = "Pushed a request to your wallet..."
        options.buttonInfo3 = "Not receiving requests?"
        options.buttonLabel3 = "Reconnect"
        options.onClickButton3 = reset
      }

      if (isRequestAccounts) {
        WalletLinkRelay.accountRequestCallbackIds.add(id)
      }

      WalletLinkRelay.callbacks.set(id, response => {
        this.closePopupWindow()
        if (notification) {
          notification.hide()
        }
        if (response.errorMessage) {
          return reject(new Error(response.errorMessage))
        }
        resolve(response as U)
      })

      const notification = new WalletLinkNotification(options)
      notification.show()

      this.postIPCMessage(Web3RequestMessage({ id, request }))
    })
  }

  private postIPCMessage(message: IPCMessage): void {
    if (!this.iframeLoaded) {
      this.actionsPendingIframeLoad.push(() => {
        this.postIPCMessage(message)
      })
      return
    }
    if (this.iframeEl && this.iframeEl.contentWindow) {
      this.iframeEl.contentWindow.postMessage(message, this.walletLinkOrigin)
    }
  }

  private openPopupWindow(path: string): void {
    if (!this.sessionId) {
      this.actionsPendingSessionId.push(() => {
        this.openPopupWindow(path)
      })
      return
    }
    const popupUrl = `${this.walletLinkUrl}/#${path}`

    if (this.popupWindow && this.popupWindow.opener) {
      if (this.popupUrl !== popupUrl) {
        this.popupWindow.location.href = popupUrl
        this.popupUrl = popupUrl
      }
      this.popupWindow.focus()
      return
    }

    const width = 320
    const height = 520
    const left = Math.floor(window.outerWidth / 2 - width / 2 + window.screenX)
    const top = Math.floor(window.outerHeight / 2 - height / 2 + window.screenY)

    this.popupUrl = popupUrl
    this.popupWindow = window.open(
      popupUrl,
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
      this.popupUrl = null
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

  private resetAndReload(): void {
    this.storage.clear()
    document.location.reload()
  }

  @bind
  private handleMessage(evt: MessageEvent): void {
    if (evt.origin !== this.walletLinkOrigin) {
      return
    }

    const message: unknown = evt.data

    if (isWeb3ResponseMessage(message)) {
      const { response } = message

      if (isRequestEthereumAccountsResponse(response)) {
        Array.from(WalletLinkRelay.accountRequestCallbackIds.values()).forEach(
          id => this.invokeCallback({ ...message, id })
        )
        WalletLinkRelay.accountRequestCallbackIds.clear()
        return
      }

      this.invokeCallback(message)
      return
    }

    if (isSessionIdResponseMessage(message)) {
      const { sessionId } = message
      if (this.sessionId !== null && this.sessionId !== sessionId) {
        // sessionId changed, clear all local data and reload page
        this.resetAndReload()
        return
      }
      this.sessionId = sessionId
      this.setStorageItem(LOCAL_STORAGE_SESSION_ID_KEY, sessionId)

      this.actionsPendingSessionId.forEach(action => action())
      this.actionsPendingSessionId = []
      return
    }

    if (isLinkedMessage(message)) {
      this.linked = true
      return
    }

    if (isUnlinkedMessage(message)) {
      this.linked = false
      this.resetAndReload()
      return
    }

    if (isLocalStorageBlockedMessage(message)) {
      this.localStorageBlocked = true

      if (
        WalletLinkRelay.accountRequestCallbackIds.size > 0 &&
        this.popupWindow
      ) {
        Array.from(WalletLinkRelay.accountRequestCallbackIds.values()).forEach(
          id =>
            this.invokeCallback(
              Web3ResponseMessage({
                id,
                response: ErrorResponse(
                  Web3Method.requestEthereumAccounts,
                  BLOCKED_LOCAL_STORAGE_ERROR_MESSAGE
                )
              })
            )
        )
        WalletLinkRelay.accountRequestCallbackIds.clear()
        walletLinkBlockedDialog.show()
        this.closePopupWindow()
      }
      return
    }
  }

  @bind
  private handleBeforeUnload(_evt: BeforeUnloadEvent): void {
    this.closePopupWindow()
  }
}

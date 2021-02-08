// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import BN from "bn.js"
import crypto from "crypto"
import { Observable, of } from "rxjs"
import { catchError, filter, timeout } from "rxjs/operators"
import url from "url"
import { LinkFlow } from "../components/LinkFlow"
import { Snackbar, SnackbarItemProps } from "../components/Snackbar"
import { ServerMessageEvent } from "../connection/ServerMessage"
import { WalletLinkConnection } from "../connection/WalletLinkConnection"
import { ScopedLocalStorage } from "../lib/ScopedLocalStorage"
import { AddressString, IntNumber, RegExpString } from "../types"
import { bigIntStringFromBN, hexStringFromBuffer, prepend0x } from "../util"
import * as aes256gcm from "./aes256gcm"
import { RelayMessage } from "./RelayMessage"
import { Session } from "./Session"
import { Web3Method } from "./Web3Method"
import {
  ArbitraryRequest,
  EthereumAddressFromSignedMessageRequest,
  RequestEthereumAccountsRequest,
  ScanQRCodeRequest,
  SignEthereumMessageRequest,
  SignEthereumTransactionRequest,
  SubmitEthereumTransactionRequest,
  Web3Request
} from "./Web3Request"
import { Web3RequestCanceledMessage } from "./Web3RequestCanceledMessage"
import { Web3RequestMessage } from "./Web3RequestMessage"
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
} from "./Web3Response"
import {
  isWeb3ResponseMessage,
  Web3ResponseMessage
} from "./Web3ResponseMessage"

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
  version: string
  darkMode: boolean
}

export class WalletLinkRelay {
  private static _nextRequestId = 0
  private static callbacks = new Map<string, ResponseCallback>()
  private static accountRequestCallbackIds = new Set<string>()

  private readonly walletLinkUrl: string
  private readonly walletLinkOrigin: string
  private readonly storage: ScopedLocalStorage
  private readonly session: Session
  private readonly connection: WalletLinkConnection

  private readonly linkFlow: LinkFlow
  private readonly snackbar: Snackbar

  private appName = ""
  private appLogoUrl: string | null = null
  private attached = false

  constructor(options: Readonly<WalletLinkRelayOptions>) {
    this.walletLinkUrl = options.walletLinkUrl

    const u = url.parse(this.walletLinkUrl)
    this.walletLinkOrigin = `${u.protocol}//${u.host}`
    this.storage = new ScopedLocalStorage(
      `-walletlink:${this.walletLinkOrigin}`
    )
    this.session =
      Session.load(this.storage) || new Session(this.storage).save()

    this.connection = new WalletLinkConnection(
      this.session.id,
      this.session.key,
      this.walletLinkUrl
    )

    this.connection.incomingEvent$
      .pipe(filter(m => m.event === "Web3Response"))
      .subscribe({ next: this.handleIncomingEvent })

    // if session is marked destroyed, reset and reload
    this.connection.sessionConfig$
      .pipe(filter(c => !!c.metadata && c.metadata.__destroyed === "1"))
      .subscribe({ next: this.resetAndReload })

    this.snackbar = new Snackbar({
      darkMode: options.darkMode
    })

    this.linkFlow = new LinkFlow({
      darkMode: options.darkMode,
      version: options.version,
      sessionId: this.session.id,
      sessionSecret: this.session.secret,
      walletLinkUrl: this.walletLinkUrl,
      connected$: this.connection.connected$
    })

    this.connection.connect()
  }

  @bind
  public resetAndReload(): void {
    this.connection
      .setSessionMetadata("__destroyed", "1")
      .pipe(
        timeout(1000),
        catchError(_ => of(null))
      )
      .subscribe(_ => {
        this.connection.destroy()
        this.storage.clear()
        document.location.reload()
      })
  }

  public setAppInfo(appName: string, appLogoUrl: string | null): void {
    this.appName = appName
    this.appLogoUrl = appLogoUrl
  }

  public attach(el: Element): void {
    if (this.attached) {
      throw new Error("WalletLinkRelay is already attached")
    }
    const container = document.createElement("div")
    container.className = "-walletlink-css-reset"
    el.appendChild(container)

    this.linkFlow.attach(container)
    this.snackbar.attach(container)
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
    return new Promise((resolve, reject) => {
      let hideSnackbarItem: (() => void) | null = null
      const id = crypto.randomBytes(8).toString("hex")
      const isRequestAccounts =
        request.method === Web3Method.requestEthereumAccounts
      const cancel = () => {
        this.publishWeb3RequestCanceledEvent(id)
        this.handleWeb3ResponseMessage(
          Web3ResponseMessage({
            id,
            response: ErrorResponse(request.method, "User rejected request")
          })
        )
        hideSnackbarItem?.()
      }

      if (isRequestAccounts) {
        this.linkFlow.open({ onCancel: cancel })
        WalletLinkRelay.accountRequestCallbackIds.add(id)
      } else {
        const snackbarProps: SnackbarItemProps = {
          message: "Pushed a request to your wallet...",
          showProgressBar: true,
          actions: [
            {
              info: "Made a mistake?",
              buttonLabel: "Cancel",
              onClick: cancel
            },
            {
              info: "Not receiving requests?",
              buttonLabel: "Reset Connection",
              onClick: this.resetAndReload
            }
          ]
        }

        hideSnackbarItem = this.snackbar.presentItem(snackbarProps)
      }

      WalletLinkRelay.callbacks.set(id, response => {
        this.linkFlow.close()
        hideSnackbarItem?.()

        if (response.errorMessage) {
          return reject(new Error(response.errorMessage))
        }
        resolve(response as U)
      })

      this.publishWeb3RequestEvent(id, request)
    })
  }

  public static makeRequestId(): number {
    // max nextId == max int32 for compatibility with mobile
    this._nextRequestId = (this._nextRequestId + 1) % 0x7fffffff
    const id = this._nextRequestId
    const idStr = prepend0x(id.toString(16))
    // unlikely that this will ever be an issue, but just to be safe
    const callback = WalletLinkRelay.callbacks.get(idStr)
    if (callback) {
      // TODO - how to handle this case
      WalletLinkRelay.callbacks.delete(idStr)
    }
    return id
  }

  private publishWeb3RequestEvent(id: string, request: Web3Request): void {
    const message = Web3RequestMessage({ id, request })
    this.publishEvent("Web3Request", message, true).subscribe({
      error: err => {
        this.handleWeb3ResponseMessage(
          Web3ResponseMessage({
            id: message.id,
            response: {
              method: message.request.method,
              errorMessage: err.message
            }
          })
        )
      }
    })
  }

  private publishWeb3RequestCanceledEvent(id: string) {
    const message = Web3RequestCanceledMessage(id)
    this.publishEvent("Web3RequestCanceled", message, false).subscribe()
  }

  private publishEvent(
    event: string,
    message: RelayMessage,
    callWebhook: boolean
  ): Observable<string> {
    const encrypted = aes256gcm.encrypt(
      JSON.stringify({ ...message, origin: location.origin }),
      this.session.secret
    )
    return this.connection.publishEvent(event, encrypted, callWebhook)
  }

  @bind
  private handleIncomingEvent(event: ServerMessageEvent): void {
    let json: unknown
    try {
      json = JSON.parse(aes256gcm.decrypt(event.data, this.session.secret))
    } catch {
      return
    }

    const message = isWeb3ResponseMessage(json) ? json : null
    if (!message) {
      return
    }

    this.handleWeb3ResponseMessage(message)
  }

  private handleWeb3ResponseMessage(message: Web3ResponseMessage) {
    const { response } = message

    if (isRequestEthereumAccountsResponse(response)) {
      Array.from(
        WalletLinkRelay.accountRequestCallbackIds.values()
      ).forEach(id => this.invokeCallback({ ...message, id }))
      WalletLinkRelay.accountRequestCallbackIds.clear()
      return
    }

    this.invokeCallback(message)
  }

  private invokeCallback(message: Web3ResponseMessage) {
    const callback = WalletLinkRelay.callbacks.get(message.id)
    if (callback) {
      callback(message.response)
      WalletLinkRelay.callbacks.delete(message.id)
    }
  }
}

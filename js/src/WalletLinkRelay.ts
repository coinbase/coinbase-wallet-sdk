// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import BN from "bn.js"
import crypto from "crypto"
import url from "url"
import { LinkFlow } from "./components/LinkFlow"
import { Snackbar, SnackbarItemProps } from "./components/Snackbar"
import { ScopedLocalStorage } from "./ScopedLocalStorage"
import { Session } from "./Session"
import { AddressString, IntNumber, RegExpString } from "./types/common"
import { IPCMessage } from "./types/IPCMessage"
import { isLinkedMessage } from "./types/LinkedMessage"
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
}

export class WalletLinkRelay {
  private static callbacks = new Map<string, ResponseCallback>()
  private static accountRequestCallbackIds = new Set<string>()

  private readonly walletLinkUrl: string
  private readonly walletLinkOrigin: string
  private readonly storage: ScopedLocalStorage
  private readonly session: Session

  private readonly linkFlow: LinkFlow
  private readonly snackbar = new Snackbar()

  private appName = ""
  private appLogoUrl: string | null = null
  private attached = false
  private linked = false
  private pendingActions: (() => void)[] = []

  constructor(options: Readonly<WalletLinkRelayOptions>) {
    this.walletLinkUrl = options.walletLinkUrl

    const u = url.parse(this.walletLinkUrl)
    this.walletLinkOrigin = `${u.protocol}//${u.host}`
    this.storage = new ScopedLocalStorage(
      `-walletlink:${this.walletLinkOrigin}`
    )
    this.session =
      Session.load(this.storage) || new Session(this.storage).save()

    this.linkFlow = new LinkFlow({
      version: options.version,
      sessionId: this.session.id,
      sessionSecret: this.session.secret,
      walletLinkUrl: this.walletLinkUrl
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

    window.addEventListener("message", this.handleMessage, false)
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

      const cancel = () => {
        this.postIPCMessage(Web3RequestCanceledMessage(id))
        this.invokeCallback(
          Web3ResponseMessage({
            id,
            response: ErrorResponse(request.method, "User rejected request")
          })
        )
        hideSnackbarItem?.()
      }

      const snackbarProps: SnackbarItemProps = {
        showProgressBar: true,
        actions: [
          {
            info: "Made a mistake?",
            buttonLabel: "Cancel",
            onClick: cancel
          }
        ]
      }

      const isRequestAccounts =
        request.method === Web3Method.requestEthereumAccounts

      if (!this.linked && isRequestAccounts) {
        snackbarProps.message = "Requesting to connect to your wallet..."
        this.openLinkFlow()
      } else {
        snackbarProps.message = "Pushed a request to your wallet..."
        snackbarProps.actions?.push({
          info: "Not receiving requests?",
          buttonLabel: "Reset Connection",
          onClick: this.resetAndReload
        })
      }

      if (isRequestAccounts) {
        WalletLinkRelay.accountRequestCallbackIds.add(id)
      }

      WalletLinkRelay.callbacks.set(id, response => {
        this.closeLinkFlow()
        hideSnackbarItem?.()

        if (response.errorMessage) {
          return reject(new Error(response.errorMessage))
        }
        resolve(response as U)
      })

      hideSnackbarItem = this.snackbar.presentItem(snackbarProps)

      this.postIPCMessage(Web3RequestMessage({ id, request }))
    })
  }

  private openLinkFlow(): void {
    this.linkFlow.open()
  }

  private closeLinkFlow(): void {
    this.linkFlow.close()
  }

  private postIPCMessage(message: IPCMessage): void {
    if (!this.linked) {
      this.pendingActions.push(() => {
        this.postIPCMessage(message)
      })
      return
    }
    // if (this.iframeEl && this.iframeEl.contentWindow) {
    //   this.iframeEl.contentWindow.postMessage(message, this.walletLinkOrigin)
    // }
  }

  private invokeCallback(message: Web3ResponseMessage) {
    const callback = WalletLinkRelay.callbacks.get(message.id)
    if (callback) {
      callback(message.response)
      WalletLinkRelay.callbacks.delete(message.id)
    }
  }

  @bind
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
        Array.from(
          WalletLinkRelay.accountRequestCallbackIds.values()
        ).forEach(id => this.invokeCallback({ ...message, id }))
        WalletLinkRelay.accountRequestCallbackIds.clear()
        return
      }

      this.invokeCallback(message)
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
  }
}

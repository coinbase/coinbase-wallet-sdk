// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import crypto from "crypto"
import { Observable, of } from "rxjs"
import { catchError, distinctUntilChanged, filter, map, timeout } from "rxjs/operators"
import { ServerMessageEvent } from "../connection/ServerMessage"
import { WalletLinkConnection } from "../connection/WalletLinkConnection"
import { ScopedLocalStorage } from "../lib/ScopedLocalStorage"
import { AddressString, IntNumber, RegExpString } from "../types"
import { bigIntStringFromBN, hexStringFromBuffer } from "../util"
import * as aes256gcm from "./aes256gcm"
import { RelayMessage } from "./RelayMessage"
import { Session } from "./Session"
import { Web3Method } from "./Web3Method"
import {
  ArbitraryRequest,
  ChildRequestEthereumAccountsRequest,
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
  ChildRequestEthereumAccountsResponse,
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
import { WalletLinkUI, WalletLinkUIOptions } from "../provider/WalletLinkUI"
import { WalletLinkRelayEventManager } from "./WalletLinkRelayEventManager"
import { WalletLinkRelayAbstract, WALLET_USER_NAME_KEY } from "./WalletLinkRelayAbstract"
import { EthereumTransactionParams } from "./EthereumTransactionParams"


export interface WalletLinkRelayOptions {
  walletLinkUrl: string
  version: string
  darkMode: boolean
  storage: ScopedLocalStorage
  relayEventManager: WalletLinkRelayEventManager
  walletLinkUIConstructor: (
    options: Readonly<WalletLinkUIOptions>
  ) => WalletLinkUI
}

export class WalletLinkRelay implements WalletLinkRelayAbstract {
  private static accountRequestCallbackIds = new Set<string>()

  private readonly walletLinkUrl: string
  private readonly storage: ScopedLocalStorage
  private readonly session: Session
  private readonly relayEventManager: WalletLinkRelayEventManager
  private readonly connection: WalletLinkConnection
  private chainIdCallback: ((chainId: string) => void) | null = null
  private jsonRpcUrlCallback: ((jsonRpcUrl: string) => void) | null = null

  private ui: WalletLinkUI

  private appName = ""
  private appLogoUrl: string | null = null


  constructor(options: Readonly<WalletLinkRelayOptions>) {
    this.walletLinkUrl = options.walletLinkUrl
    this.storage = options.storage
    this.session =
      Session.load(options.storage) || new Session(options.storage).save()

    this.relayEventManager = options.relayEventManager

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

    this.connection.sessionConfig$
      .pipe(filter(c => c.metadata && c.metadata.WalletUsername !== undefined))
      .pipe(
        map(c =>
          aes256gcm.decrypt(c.metadata.WalletUsername!, this.session.secret)
        )
      )
      .subscribe({
        next: walletUsername => {
          this.storage.setItem(WALLET_USER_NAME_KEY, walletUsername)
        }
      })

    this.connection.sessionConfig$
      .pipe(filter(c => c.metadata && c.metadata.ChainId !== undefined))
      .pipe(map(c => aes256gcm.decrypt(c.metadata.ChainId!, this.session.secret)))
      .pipe(distinctUntilChanged())
      .subscribe({ next: chainId => {
          if (this.chainIdCallback) {
            this.chainIdCallback(chainId!)
          }
        }
      })

    this.connection.sessionConfig$
      .pipe(filter(c => c.metadata && c.metadata.JsonRpcUrl !== undefined))
      .pipe(map(c => aes256gcm.decrypt(c.metadata.JsonRpcUrl!, this.session.secret)))
      .pipe(distinctUntilChanged())
      .subscribe({
        next: jsonRpcURl => {
          if (this.jsonRpcUrlCallback) {
            this.jsonRpcUrlCallback(jsonRpcURl!);
          }
        },
      });

    this.ui = options.walletLinkUIConstructor({
      walletLinkUrl: options.walletLinkUrl,
      version: options.version,
      darkMode: options.darkMode,
      session: this.session,
      connected$: this.connection.connected$
    })

    this.connection.connect()
  }

  public attachUI() {
    this.ui.attach()
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
        this.ui.reloadUI()
      })
  }

  public setAppInfo(appName: string, appLogoUrl: string | null): void {
    this.appName = appName
    this.appLogoUrl = appLogoUrl
  }

  public getStorageItem(key: string): string | null {
    return this.storage.getItem(key)
  }

  public setStorageItem(key: string, value: string): void {
    this.storage.setItem(key, value)
  }

  public childRequestEthereumAccounts(
    childSessionId: string,
    childSessionSecret: string,
    dappName: string,
    dappLogoURL: string,
    dappURL: string
  ): Promise<ChildRequestEthereumAccountsResponse> {
    return this.sendRequest<
      ChildRequestEthereumAccountsRequest,
      ChildRequestEthereumAccountsResponse
    >({
      method: Web3Method.childRequestEthereumAccounts,
      params: {
        sessionId: childSessionId,
        sessionSecret: childSessionSecret,
        appName: dappName,
        appLogoURL: dappLogoURL,
        appURL: dappURL
      }
    })
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
        const userAgent = window?.navigator?.userAgent || null
        if (
          userAgent &&
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            userAgent
          )
        ) {
          window.location.href = "https://go.cb-w.com/kQz6p7iFFfb"
          return
        }
        if (this.ui.inlineAccountsResponse()) {
          const onAccounts = (accounts: [AddressString]) => {
            this.handleWeb3ResponseMessage(
              Web3ResponseMessage({
                id,
                response: RequestEthereumAccountsResponse(accounts)
              })
            )
          }

          this.ui.requestEthereumAccounts({
            onCancel: cancel,
            onAccounts: onAccounts
          })
        } else {
          this.ui.requestEthereumAccounts({
            onCancel: cancel
          })
        }

        WalletLinkRelay.accountRequestCallbackIds.add(id)
      } else {
        hideSnackbarItem = this.ui.showConnecting({
          onCancel: cancel,
          onResetConnection: this.resetAndReload
        })
      }

      this.relayEventManager.callbacks.set(id, response => {
        this.ui.hideRequestEthereumAccounts()
        hideSnackbarItem?.()

        if (response.errorMessage) {
          return reject(new Error(response.errorMessage))
        }
        resolve(response as U)
      })

      if (
        !isRequestAccounts ||
        !this.ui.inlineAccountsResponse()
      ) {
        this.publishWeb3RequestEvent(id, request)
      }
    })
  }

  public setConnectDisabled(disabled: boolean) {
    this.ui.setConnectDisabled(disabled)
  }

  public setChainIdCallback(chainIdCallback: (chainId: string) => void) {
    this.chainIdCallback = chainIdCallback
  }

  public setJsonRpcUrlCallback(jsonRpcUrlCallback: (jsonRpcUrl: string) => void) {
    this.jsonRpcUrlCallback = jsonRpcUrlCallback
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
    const callback = this.relayEventManager.callbacks.get(message.id)
    if (callback) {
      callback(message.response)
      this.relayEventManager.callbacks.delete(message.id)
    }
  }
}

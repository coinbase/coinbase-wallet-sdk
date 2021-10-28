// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import { Observable, of, Subscription } from "rxjs"
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  skip,
  tap,
  timeout
} from "rxjs/operators"
import { ServerMessageEvent } from "../connection/ServerMessage"
import { WalletLinkAnalytics } from "../connection/WalletLinkAnalytics"
import { WalletLinkConnection } from "../connection/WalletLinkConnection"
import { EVENTS, WalletLinkAnalyticsAbstract } from "../init"
import { ScopedLocalStorage } from "../lib/ScopedLocalStorage"
import { WalletLinkUI, WalletLinkUIOptions } from "../provider/WalletLinkUI"
import { AddressString, IntNumber, RegExpString } from "../types"
import {
  bigIntStringFromBN,
  hexStringFromBuffer,
  randomBytesHex
} from "../util"
import * as aes256gcm from "./aes256gcm"
import { EthereumTransactionParams } from "./EthereumTransactionParams"
import { RelayMessage } from "./RelayMessage"
import { Session } from "./Session"
import {
  CancelablePromise,
  LOCAL_STORAGE_ADDRESSES_KEY,
  WalletLinkRelayAbstract,
  WALLET_USER_NAME_KEY
} from "./WalletLinkRelayAbstract"
import { WalletLinkRelayEventManager } from "./WalletLinkRelayEventManager"
import { Web3Method } from "./Web3Method"
import {
  AddEthereumChainRequest,
  ArbitraryRequest,
  EthereumAddressFromSignedMessageRequest,
  RequestEthereumAccountsRequest,
  ScanQRCodeRequest,
  SignEthereumMessageRequest,
  SignEthereumTransactionRequest,
  SubmitEthereumTransactionRequest,
  SwitchEthereumChainRequest,
  Web3Request
} from "./Web3Request"
import { Web3RequestCanceledMessage } from "./Web3RequestCanceledMessage"
import { Web3RequestMessage } from "./Web3RequestMessage"
import {
  AddEthereumChainResponse,
  ArbitraryResponse,
  ErrorResponse,
  EthereumAddressFromSignedMessageResponse,
  isRequestEthereumAccountsResponse,
  RequestEthereumAccountsResponse,
  ScanQRCodeResponse,
  SignEthereumMessageResponse,
  SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse,
  SwitchEthereumChainResponse,
  Web3Response
} from "./Web3Response"
import {
  isWeb3ResponseMessage,
  Web3ResponseMessage
} from "./Web3ResponseMessage"

export interface WalletLinkRelayOptions {
  walletLinkUrl: string
  version: string
  darkMode: boolean
  storage: ScopedLocalStorage
  relayEventManager: WalletLinkRelayEventManager
  walletLinkUIConstructor: (
    options: Readonly<WalletLinkUIOptions>
  ) => WalletLinkUI
  walletLinkAnalytics?: WalletLinkAnalyticsAbstract
}

export class WalletLinkRelay implements WalletLinkRelayAbstract {
  private static accountRequestCallbackIds = new Set<string>()

  private readonly walletLinkUrl: string
  protected readonly storage: ScopedLocalStorage
  private readonly _session: Session
  private readonly relayEventManager: WalletLinkRelayEventManager
  protected readonly walletLinkAnalytics: WalletLinkAnalyticsAbstract | null
  private readonly connection: WalletLinkConnection
  private accountsCallback: ((account: [string]) => void) | null = null
  private chainIdCallback: ((chainId: string) => void) | null = null
  private jsonRpcUrlCallback: ((jsonRpcUrl: string) => void) | null = null

  private ui: WalletLinkUI

  private appName = ""
  private appLogoUrl: string | null = null
  private subscriptions = new Subscription()
  isLinked: boolean | undefined

  constructor(options: Readonly<WalletLinkRelayOptions>) {
    this.walletLinkUrl = options.walletLinkUrl
    this.storage = options.storage
    this._session =
      Session.load(options.storage) || new Session(options.storage).save()

    this.relayEventManager = options.relayEventManager
    this.walletLinkAnalytics = options.walletLinkAnalytics
      ? options.walletLinkAnalytics
      : new WalletLinkAnalytics()

    this.connection = new WalletLinkConnection(
      this._session.id,
      this._session.key,
      this.walletLinkUrl,
      this.walletLinkAnalytics
    )

    this.subscriptions.add(
      this.connection.incomingEvent$
        .pipe(filter(m => m.event === "Web3Response"))
        .subscribe({ next: this.handleIncomingEvent })
    )

    this.subscriptions.add(
      this.connection.linked$
        .pipe(
          skip(1),
          tap((linked: boolean) => {
            this.isLinked = linked
            const cachedAddresses = this.storage.getItem(
              LOCAL_STORAGE_ADDRESSES_KEY
            )
            if (cachedAddresses) {
              const addresses = cachedAddresses.split(" ") as AddressString[]
              if (addresses[0] !== "" && !linked) {
                const sessionIdHash = Session.hash(this._session.id)
                this.walletLinkAnalytics?.sendEvent(
                  EVENTS.UNLINKED_ERROR_STATE,
                  { sessionIdHash }
                )
              }
            }
          })
        )
        .subscribe()
    )

    // if session is marked destroyed, reset and reload
    this.subscriptions.add(
      this.connection.sessionConfig$
        .pipe(filter(c => !!c.metadata && c.metadata.__destroyed === "1"))
        .subscribe(() => {
          const alreadyDestroyed = this.connection.isDestroyed
          this.walletLinkAnalytics?.sendEvent(EVENTS.METADATA_DESTROYED, {
            alreadyDestroyed,
            sessionIdHash: Session.hash(this._session.id)
          })
          return this.resetAndReload()
        })
    )

    this.subscriptions.add(
      this.connection.sessionConfig$
        .pipe(
          filter(c => c.metadata && c.metadata.WalletUsername !== undefined)
        )
        .pipe(
          mergeMap(c =>
            aes256gcm.decrypt(c.metadata.WalletUsername!, this._session.secret)
          )
        )
        .subscribe({
          next: walletUsername => {
            this.storage.setItem(WALLET_USER_NAME_KEY, walletUsername)
          },
          error: () => {
            this.walletLinkAnalytics?.sendEvent(EVENTS.GENERAL_ERROR, {message: 'Had error decrypting', value: 'username'})
          }
        })
    )

    this.subscriptions.add(
      this.connection.sessionConfig$
        .pipe(filter(c => c.metadata && c.metadata.ChainId !== undefined))
        .pipe(
          mergeMap(c =>
            aes256gcm.decrypt(c.metadata.ChainId!, this._session.secret)
          )
        )
        .pipe(distinctUntilChanged())
        .subscribe({
          next: chainId => {
            if (this.chainIdCallback) {
              this.chainIdCallback(chainId!)
            }
          },
          error: () => {
            this.walletLinkAnalytics?.sendEvent(EVENTS.GENERAL_ERROR, {message: 'Had error decrypting', value: 'chainId'})
          }
        })
    )

    this.subscriptions.add(
      this.connection.sessionConfig$
        .pipe(filter(c => c.metadata && c.metadata.JsonRpcUrl !== undefined))
        .pipe(
          mergeMap(c =>
            aes256gcm.decrypt(c.metadata.JsonRpcUrl!, this._session.secret)
          )
        )
        .pipe(distinctUntilChanged())
        .subscribe({
          next: jsonRpcURl => {
            if (this.jsonRpcUrlCallback) {
              this.jsonRpcUrlCallback(jsonRpcURl!)
            }
          },
          error: () => {
            this.walletLinkAnalytics?.sendEvent(EVENTS.GENERAL_ERROR, {message: 'Had error decrypting', value: 'jsonRpcUrl'})
          }
        })
    )

    this.subscriptions.add(
      this.connection.sessionConfig$
        .pipe(
          filter(c => c.metadata && c.metadata.EthereumAddress !== undefined)
        )
        .pipe(
          mergeMap(c =>
            aes256gcm.decrypt(c.metadata.EthereumAddress!, this._session.secret)
          )
        )
        .subscribe({
          next: selectedAddress => {
            if (this.accountsCallback) {
              this.accountsCallback([selectedAddress])
            }

            if (WalletLinkRelay.accountRequestCallbackIds.size > 0) {
              // We get the ethereum address from the metadata.  If for whatever
              // reason we don't get a response via an explicit web3 message
              // we can still fulfill the eip1102 request.
              Array.from(
                WalletLinkRelay.accountRequestCallbackIds.values()
              ).forEach(id => {
                const message = Web3ResponseMessage({
                  id,
                  response: RequestEthereumAccountsResponse([
                    selectedAddress as AddressString
                  ])
                })
                this.invokeCallback({ ...message, id })
              })
              WalletLinkRelay.accountRequestCallbackIds.clear()
            }
          },
          error: () => {
            this.walletLinkAnalytics?.sendEvent(EVENTS.GENERAL_ERROR, {message: 'Had error decrypting', value: 'selectedAddress'})
          }
        })
    )

    this.ui = options.walletLinkUIConstructor({
      walletLinkUrl: options.walletLinkUrl,
      version: options.version,
      darkMode: options.darkMode,
      session: this._session,
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
      .subscribe(
        _ => {
          try {
            this.subscriptions.unsubscribe()
          } catch (err) {
            this.walletLinkAnalytics?.sendEvent(EVENTS.GENERAL_ERROR, {
              message: "Had error unsubscribing"
            })
          }

          this.walletLinkAnalytics?.sendEvent(EVENTS.SESSION_STATE_CHANGE, {
            method: "relay::resetAndReload",
            sessionMetadataChange: "__destroyed, 1",
            sessionIdHash: Session.hash(this._session.id)
          })
          this.connection.destroy()
          this.storage.clear()
          this.ui.reloadUI()
        },
        err => {
          this.walletLinkAnalytics?.sendEvent(EVENTS.FAILURE, {
            method: "relay::resetAndReload",
            message: `faled to reset and relod with ${err}`,
            sessionIdHash: Session.hash(this._session.id)
          })
        }
      )
  }

  public setAppInfo(appName: string, appLogoUrl: string | null): void {
    this.appName = appName
    this.appLogoUrl = appLogoUrl
  }

  public getStorageItem(key: string): string | null {
    return this.storage.getItem(key)
  }

  public get session(): Session {
    return this._session
  }

  public setStorageItem(key: string, value: string): void {
    this.storage.setItem(key, value)
  }

  public requestEthereumAccounts(): CancelablePromise<RequestEthereumAccountsResponse> {
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
  ): CancelablePromise<SignEthereumMessageResponse> {
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
  ): CancelablePromise<EthereumAddressFromSignedMessageResponse> {
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
  ): CancelablePromise<SignEthereumTransactionResponse> {
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
        maxFeePerGas: params.gasPriceInWei
          ? bigIntStringFromBN(params.gasPriceInWei)
          : null,
        maxPriorityFeePerGas: params.gasPriceInWei
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
  ): CancelablePromise<SubmitEthereumTransactionResponse> {
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
        maxFeePerGas: params.maxFeePerGas
          ? bigIntStringFromBN(params.maxFeePerGas)
          : null,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas
          ? bigIntStringFromBN(params.maxPriorityFeePerGas)
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
  ): CancelablePromise<SubmitEthereumTransactionResponse> {
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

  public scanQRCode(
    regExp: RegExpString
  ): CancelablePromise<ScanQRCodeResponse> {
    return this.sendRequest<ScanQRCodeRequest, ScanQRCodeResponse>({
      method: Web3Method.scanQRCode,
      params: { regExp }
    })
  }

  public arbitraryRequest(data: string): CancelablePromise<ArbitraryResponse> {
    return this.sendRequest<ArbitraryRequest, ArbitraryResponse>({
      method: Web3Method.arbitrary,
      params: { data }
    })
  }

  public addEthereumChain(
    chainId: string,
    blockExplorerUrls?: string[],
    chainName?: string,
    iconUrls?: string[],
    nativeCurrency?: { name: string; symbol: string; decimals: number }
  ): CancelablePromise<AddEthereumChainResponse> {
    return this.sendRequest<AddEthereumChainRequest, AddEthereumChainResponse>({
      method: Web3Method.addEthereumChain,
      params: {
        chainId,
        blockExplorerUrls,
        chainName,
        iconUrls,
        nativeCurrency
      }
    })
  }

  public sendRequest<T extends Web3Request, U extends Web3Response>(
    request: T
  ): CancelablePromise<U> {
    let hideSnackbarItem: (() => void) | null = null
    const id = randomBytesHex(8)
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
    const promise = new Promise<U>((resolve, reject) => {
      const isRequestAccounts =
        request.method === Web3Method.requestEthereumAccounts
      const isSwitchEthereumChain =
        request.method === Web3Method.switchEthereumChain

      if (isRequestAccounts) {
        const userAgent = window?.navigator?.userAgent || null
        if (
          userAgent &&
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            userAgent
          )
        ) {
          window.location.href = `https://go.cb-w.com/xoXnYwQimhb?cb_url=${window.location.href}`
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
            onAccounts
          })
        } else {
          this.ui.requestEthereumAccounts({
            onCancel: cancel
          })
        }

        WalletLinkRelay.accountRequestCallbackIds.add(id)
      } else if (
        request.method === Web3Method.switchEthereumChain ||
        request.method === Web3Method.addEthereumChain
      ) {
        const cancel = () => {
          this.handleWeb3ResponseMessage(
            Web3ResponseMessage({
              id,
              response: SwitchEthereumChainResponse(false)
            })
          )
        }
        const approve = () => {
          this.handleWeb3ResponseMessage(
            Web3ResponseMessage({
              id,
              response: SwitchEthereumChainResponse(true)
            })
          )
        }

        this.ui.switchEthereumChain({
          onCancel: cancel,
          onApprove: approve,
          chainId: (request as SwitchEthereumChainRequest).params.chainId
        })

        if (!this.ui.inlineSwitchEthereumChain()) {
          hideSnackbarItem = this.ui.showConnecting({
            onCancel: cancel,
            onResetConnection: this.resetAndReload
          })
        }
      } else if (this.ui.isStandalone()) {
        const onCancel = () => {
          this.handleWeb3ResponseMessage(
            Web3ResponseMessage({
              id,
              response: ErrorResponse(request.method, "User rejected request")
            })
          )
        }

        const onSuccess = (
          response:
            | SignEthereumMessageResponse
            | SignEthereumTransactionResponse
            | SubmitEthereumTransactionResponse
            | EthereumAddressFromSignedMessageResponse
        ) => {
          this.handleWeb3ResponseMessage(
            Web3ResponseMessage({
              id,
              response: response
            })
          )
        }

        switch (request.method) {
          case Web3Method.signEthereumMessage:
            this.ui.signEthereumMessage({
              request: request as SignEthereumMessageRequest,
              onSuccess,
              onCancel
            })
            break
          case Web3Method.signEthereumTransaction:
            this.ui.signEthereumTransaction({
              request: request as SignEthereumTransactionRequest,
              onSuccess,
              onCancel
            })
            break
          case Web3Method.submitEthereumTransaction:
            this.ui.submitEthereumTransaction({
              request: request as SubmitEthereumTransactionRequest,
              onSuccess,
              onCancel
            })
            break
          case Web3Method.ethereumAddressFromSignedMessage:
            this.ui.ethereumAddressFromSignedMessage({
              request: request as EthereumAddressFromSignedMessageRequest,
              onSuccess
            })
            break
          default:
            onCancel()
            break
        }
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
        (isRequestAccounts && this.ui.inlineAccountsResponse()) ||
        (isSwitchEthereumChain && this.ui.inlineSwitchEthereumChain()) ||
        this.ui.isStandalone()
      ) {
        return
      }

      this.publishWeb3RequestEvent(id, request)
    })

    return { promise, cancel }
  }

  public setConnectDisabled(disabled: boolean) {
    this.ui.setConnectDisabled(disabled)
  }

  public setAccountsCallback(accountsCallback: (accounts: [string]) => void) {
    this.accountsCallback = accountsCallback
  }

  public setChainIdCallback(chainIdCallback: (chainId: string) => void) {
    this.chainIdCallback = chainIdCallback
  }

  public setJsonRpcUrlCallback(
    jsonRpcUrlCallback: (jsonRpcUrl: string) => void
  ) {
    this.jsonRpcUrlCallback = jsonRpcUrlCallback
  }

  private publishWeb3RequestEvent(id: string, request: Web3Request): void {
    const message = Web3RequestMessage({ id, request })
    this.subscriptions.add(
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
    )
  }

  private publishWeb3RequestCanceledEvent(id: string) {
    const message = Web3RequestCanceledMessage(id)
    this.subscriptions.add(
      this.publishEvent("Web3RequestCanceled", message, false).subscribe()
    )
  }

  protected publishEvent(
    event: string,
    message: RelayMessage,
    callWebhook: boolean
  ): Observable<string> {
    const secret = this.session.secret
    return new Observable<string>(subscriber => {
      aes256gcm
        .encrypt(
          JSON.stringify({ ...message, origin: location.origin }),
          secret
        )
        .then((encrypted: string) => {
          subscriber.next(encrypted)
          subscriber.complete()
        })
    }).pipe(
      mergeMap((encrypted: string) => {
        return this.connection.publishEvent(event, encrypted, callWebhook)
      })
    )
  }

  @bind
  private handleIncomingEvent(event: ServerMessageEvent): void {
    try {
      this.subscriptions.add(
        aes256gcm
          .decrypt(event.data, this.session.secret)
          .pipe(map(c => JSON.parse(c)))
          .subscribe({
            next: json => {
              const message = isWeb3ResponseMessage(json) ? json : null
              if (!message) {
                return
              }

              this.handleWeb3ResponseMessage(message)
            },
            error: () => {
              this.walletLinkAnalytics?.sendEvent(EVENTS.GENERAL_ERROR, {message: 'Had error decrypting', value: 'incomingEvent'})
            }
          })
      )
    } catch {
      return
    }
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

  switchEthereumChain(
    chainId: string
  ): CancelablePromise<SwitchEthereumChainResponse> {
    return this.sendRequest<
      SwitchEthereumChainRequest,
      SwitchEthereumChainResponse
    >({
      method: Web3Method.switchEthereumChain,
      params: {
        chainId
      }
    })
  }
}

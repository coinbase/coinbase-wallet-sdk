// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import { BehaviorSubject, fromEvent, Subscription } from "rxjs"
import { filter } from "rxjs/operators"
import * as aes256gcm from "../lib/aes256gcm"
import { nextTick, postMessageToParent } from "../lib/util"
import { ServerMessageEvent } from "../WalletLink/messages"
import { Session } from "../WalletLink/Session"
import { IPCMessage } from "../WalletLink/types/IPCMessage"
import { LinkedMessage } from "../WalletLink/types/LinkedMessage"
import { isSessionIdRequestMessage } from "../WalletLink/types/SessionIdRequestMessage"
import { SessionIdResponseMessage } from "../WalletLink/types/SessionIdResponseMessage"
import { UnlinkedMessage } from "../WalletLink/types/UnlinkedMessage"
import {
  isWeb3RequestMessage,
  Web3RequestMessage,
  Web3RequestMessageWithOrigin
} from "../WalletLink/types/Web3RequestMessage"
import {
  isWeb3ResponseMessage,
  Web3ResponseMessage
} from "../WalletLink/types/Web3ResponseMessage"
import { WalletLinkHost } from "../WalletLink/WalletLinkHost"

export interface MainRepositoryOptions {
  webUrl: string
  serverUrl: string
  session?: Session
  walletLinkHost?: WalletLinkHost
}

export class MainRepository {
  private readonly _webUrl: string
  private readonly _serverUrl: string
  private readonly session: Session
  private readonly walletLinkHost: WalletLinkHost
  private readonly subscriptions = new Subscription()
  private readonly ethereumAddressesSubject = new BehaviorSubject<string[]>([])

  constructor(options: Readonly<MainRepositoryOptions>) {
    this._webUrl = options.webUrl
    this._serverUrl = options.serverUrl

    const session = options.session || Session.load() || new Session().save()
    this.session = session

    const walletLinkHost =
      options.walletLinkHost ||
      new WalletLinkHost(session.id, session.key, options.serverUrl)
    this.walletLinkHost = walletLinkHost

    walletLinkHost.connect()

    this.subscriptions.add(
      walletLinkHost.linked$.subscribe(linked => {
        if (linked) {
          this.postIPCMessage(LinkedMessage())
        }
      })
    )

    this.subscriptions.add(
      Session.persistedSessionIdChange$.subscribe(change => {
        if (change.oldValue && !change.newValue) {
          this.postIPCMessage(UnlinkedMessage())
        }
      })
    )

    this.subscriptions.add(
      walletLinkHost.sessionConfig$.subscribe(config => {
        if (
          config.metadata &&
          typeof config.metadata.EthereumAddress === "string"
        ) {
          let decrypted: string
          try {
            decrypted = aes256gcm.decrypt(
              config.metadata.EthereumAddress,
              this.sessionSecret
            )
          } catch {
            return
          }
          const addresses = decrypted.toLowerCase().split(" ")
          if (addresses) {
            this.ethereumAddressesSubject.next(addresses)
          }
        }
      })
    )

    this.subscriptions.add(
      fromEvent<MessageEvent>(window, "message").subscribe(this.handleMessage)
    )

    this.subscriptions.add(
      this.walletLinkHost.incomingEvent$
        .pipe(filter(m => m.event === "Web3Response"))
        .subscribe(this.handleWeb3ResponseEvent)
    )
  }

  public destroy(): void {
    this.subscriptions.unsubscribe()
    this.walletLinkHost.destroy()
  }

  public get webUrl() {
    return this._webUrl
  }

  public get serverUrl() {
    return this._serverUrl
  }

  public get sessionId() {
    return this.session.id
  }

  public get sessionSecret() {
    return this.session.secret
  }

  public get sessionKey() {
    return this.session.key
  }

  public get linked$() {
    return this.walletLinkHost.linked$
  }

  public get onceLinked$() {
    return this.walletLinkHost.onceLinked$
  }

  public get sessionConfig$() {
    return this.walletLinkHost.sessionConfig$
  }

  public get ethereumAddresses() {
    return this.ethereumAddressesSubject.getValue()
  }

  public get ethereumAddresses$() {
    return this.ethereumAddressesSubject.asObservable()
  }

  public denyEthereumAddressesFromOpener(origin: string = "*"): void {
    const message = Web3ResponseMessage({
      id: "",
      response: {
        method: "requestEthereumAccounts",
        errorMessage: "User denied account authorization"
      }
    })
    this.postIPCMessage(message, origin)
  }

  private postIPCMessage(message: IPCMessage, origin: string = "*"): void {
    postMessageToParent(message, origin)
  }

  @bind
  private handleMessage(evt: MessageEvent): void {
    const message = evt.data
    const { origin } = evt

    if (isWeb3RequestMessage(message)) {
      this.handleWeb3Request(message, origin)
      return
    }

    if (isSessionIdRequestMessage(message)) {
      this.postIPCMessage(SessionIdResponseMessage(this.session.id))
      return
    }
  }

  private handleWeb3Request(request: Web3RequestMessage, origin: string): void {
    const requestWithOrigin = Web3RequestMessageWithOrigin(request, origin)
    const encrypted = aes256gcm.encrypt(
      JSON.stringify(requestWithOrigin),
      this.session.secret
    )
    const sub = this.walletLinkHost
      .publishEvent("Web3Request", encrypted)
      .subscribe(null, err => {
        const response = Web3ResponseMessage({
          id: request.id,
          response: {
            method: request.request.method,
            errorMessage: err.message || String(err)
          }
        })
        this.postIPCMessage(response)
        nextTick(() => this.subscriptions.remove(sub))
      })
    this.subscriptions.add(sub)
  }

  @bind
  private handleWeb3ResponseEvent(message: ServerMessageEvent): void {
    let json: unknown
    try {
      json = JSON.parse(aes256gcm.decrypt(message.data, this.session.secret))
    } catch {
      return
    }

    const response = isWeb3ResponseMessage(json) ? json : null
    if (!response) {
      return
    }

    this.postIPCMessage(response)
  }
}

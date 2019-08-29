// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import { fromEvent, ReplaySubject } from "rxjs"
import { filter, takeUntil } from "rxjs/operators"
import * as aes256gcm from "../lib/aes256gcm"
import { postMessageToParent } from "../lib/util"
import { ServerMessageEvent } from "../WalletLink/messages"
import { Session } from "../WalletLink/Session"
import { IPCMessage } from "../WalletLink/types/IPCMessage"
import { LinkedMessage } from "../WalletLink/types/LinkedMessage"
import { isSessionIdRequestMessage } from "../WalletLink/types/SessionIdRequestMessage"
import { SessionIdResponseMessage } from "../WalletLink/types/SessionIdResponseMessage"
import { UnlinkedMessage } from "../WalletLink/types/UnlinkedMessage"
import {
  isWeb3RequestCanceledMessage,
  Web3RequestCanceledMessage,
  Web3RequestCanceledMessageWithOrigin
} from "../WalletLink/types/Web3RequestCanceledMessage"
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
  private readonly destroyed$ = new ReplaySubject<void>()

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

    walletLinkHost.linked$.pipe(takeUntil(this.destroyed$)).subscribe({
      next: linked => {
        if (linked) {
          session.linked = linked
          this.postIPCMessage(LinkedMessage())
        }
      }
    })

    Session.persistedSessionIdChange$
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: change => {
          if (change.oldValue && !change.newValue) {
            this.postIPCMessage(UnlinkedMessage())
          }
        }
      })

    fromEvent<MessageEvent>(window, "message")
      .pipe(takeUntil(this.destroyed$))
      .subscribe({ next: this.handleMessage })

    this.walletLinkHost.incomingEvent$
      .pipe(
        takeUntil(this.destroyed$),
        filter(m => m.event === "Web3Response")
      )
      .subscribe({ next: this.handleWeb3ResponseEvent })
  }

  public destroy(): void {
    this.destroyed$.next()
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

  public get sessionLinked() {
    return this.session.linked
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

    if (isWeb3RequestCanceledMessage(message)) {
      this.handleWeb3RequestCanceled(message, origin)
      return
    }

    if (isSessionIdRequestMessage(message)) {
      this.postIPCMessage(SessionIdResponseMessage(this.session.id))
      return
    }
  }

  private handleWeb3Request(message: Web3RequestMessage, origin: string): void {
    const messageWithOrigin = Web3RequestMessageWithOrigin(message, origin)
    const encrypted = aes256gcm.encrypt(
      JSON.stringify(messageWithOrigin),
      this.session.secret
    )
    this.walletLinkHost
      .publishEvent("Web3Request", encrypted, true)
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        error: err => {
          const response = Web3ResponseMessage({
            id: message.id,
            response: {
              method: message.request.method,
              errorMessage: err.message || String(err)
            }
          })
          this.postIPCMessage(response)
        }
      })
  }

  private handleWeb3RequestCanceled(
    message: Web3RequestCanceledMessage,
    origin: string
  ): void {
    const messageWithOrigin = Web3RequestCanceledMessageWithOrigin(
      message,
      origin
    )
    const encrypted = aes256gcm.encrypt(
      JSON.stringify(messageWithOrigin),
      this.session.secret
    )
    this.walletLinkHost
      .publishEvent("Web3RequestCanceled", encrypted, false)
      .pipe(takeUntil(this.destroyed$))
      .subscribe()
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

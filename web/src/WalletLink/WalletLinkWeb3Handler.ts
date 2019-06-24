// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import { empty, fromEvent, of, Subscription } from "rxjs"
import { filter, flatMap } from "rxjs/operators"
import * as aes256gcm from "../lib/aes256gcm"
import { nextTick } from "../lib/util"
import { postMessageToParent } from "./ipc"
import { ServerMessageEvent } from "./messages"
import {
  isWeb3RequestMessage,
  Web3RequestMessageWithOrigin
} from "./types/Web3RequestMessage"
import {
  isWeb3ResponseMessage,
  Web3ResponseMessage
} from "./types/Web3ResponseMessage"
import { WalletLinkHost } from "./WalletLinkHost"

export class WalletLinkWeb3Handler {
  private subscriptions = new Subscription()

  constructor(
    private readonly walletLinkHost: WalletLinkHost,
    private readonly secret: string
  ) {}

  public listen() {
    this.subscriptions.add(
      fromEvent<MessageEvent>(window, "message")
        .pipe(
          flatMap(evt =>
            isWeb3RequestMessage(evt.data)
              ? of(Web3RequestMessageWithOrigin(evt.data, evt.origin))
              : empty()
          )
        )
        .subscribe(this.handleWeb3Request)
    )

    this.subscriptions.add(
      this.walletLinkHost.incomingEvent$
        .pipe(filter(m => m.event === "Web3Response"))
        .subscribe(this.handleWeb3ResponseEvent)
    )
  }

  public destroy() {
    this.subscriptions.unsubscribe()
  }

  @bind
  private handleWeb3Request(request: Web3RequestMessageWithOrigin): void {
    const encrypted = aes256gcm.encrypt(JSON.stringify(request), this.secret)

    const sub = this.walletLinkHost
      .publishEvent("Web3Request", encrypted)
      .subscribe(null, err => {
        const response = Web3ResponseMessage({
          id: request.id,
          response: {
            errorMessage: err.message || String(err)
          }
        })
        postMessageToParent(response)
        nextTick(() => this.subscriptions.remove(sub))
      })
    this.subscriptions.add(sub)
  }

  @bind
  private handleWeb3ResponseEvent(message: ServerMessageEvent): void {
    let json: unknown
    try {
      json = JSON.parse(aes256gcm.decrypt(message.data, this.secret))
    } catch {
      return
    }

    const response = isWeb3ResponseMessage(json) ? json : null
    if (!response) {
      return
    }

    postMessageToParent(response)
  }
}

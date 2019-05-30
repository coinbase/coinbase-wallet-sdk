// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import { empty, fromEvent, of, Subscription } from "rxjs"
import { filter, flatMap } from "rxjs/operators"
import * as aes256gcm from "../lib/aes256gcm"
import { ServerMessageEvent } from "./messages"
import {
  isWeb3RequestMessage,
  isWeb3ResponseMessage,
  Web3RequestMessageWithOrigin
} from "./types"
import { WalletLinkHost } from "./WalletLinkHost"

export class WalletLinkWeb3Handler {
  private subscriptions = new Subscription()

  constructor(private walletLinkHost: WalletLinkHost, private secret: string) {}

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

    this.walletLinkHost
      .publishEvent("Web3Request", encrypted)
      .subscribe(null, err => console.log(err))
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

    if (window.parent) {
      window.parent.postMessage(response, "*")
    }
  }
}

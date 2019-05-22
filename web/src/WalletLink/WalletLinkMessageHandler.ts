// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import { Subscription } from "rxjs"
import { filter } from "rxjs/operators"
import * as aes256gcm from "../lib/aes256gcm"
import { ServerMessageEvent } from "./messages"
import { WalletLinkHost } from "./WalletLinkHost"
import {
  isWeb3RequestMessage,
  isWeb3ResponseMessage,
  Web3RequestMessageWithOrigin
} from "./WalletLinkTypes"

export class WalletLinkMessageHandler {
  private subscriptions = new Subscription()

  constructor(private walletLinkHost: WalletLinkHost, private secret: string) {}

  public listen() {
    window.addEventListener("message", this.handleMessage, false)
    this.subscriptions.add(
      this.walletLinkHost.incomingEvent$
        .pipe(filter(m => m.event === "Web3Response"))
        .subscribe(this.handleWeb3Response)
    )
  }

  public destroy() {
    window.removeEventListener("message", this.handleMessage, false)
    this.subscriptions.unsubscribe()
  }

  @bind
  private handleMessage(evt: MessageEvent): void {
    const request = isWeb3RequestMessage(evt.data) ? evt.data : null
    if (!request) {
      return
    }

    const requestWithOrigin: Web3RequestMessageWithOrigin = {
      ...request,
      origin: evt.origin
    }
    const encrypted = aes256gcm.encrypt(
      JSON.stringify(requestWithOrigin),
      this.secret
    )

    this.walletLinkHost
      .publishEvent("Web3Request", encrypted)
      .subscribe(null, err => console.log(err))
  }

  @bind
  private handleWeb3Response(message: ServerMessageEvent): void {
    const json = JSON.parse(aes256gcm.decrypt(message.data, this.secret))
    const response = isWeb3ResponseMessage(json) ? json : null
    if (!response) {
      return
    }

    if (window.parent) {
      window.parent.postMessage(response, "*")
    }
  }
}

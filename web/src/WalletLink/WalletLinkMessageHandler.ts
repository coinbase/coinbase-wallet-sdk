// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import { of, Subscription } from "rxjs"
import { catchError, filter, flatMap } from "rxjs/operators"
import * as aes256gcm from "../lib/aes256gcm"
import { WalletLinkHost } from "./WalletLinkHost"

export class WalletLinkMessageHandler {
  private subscriptions = new Subscription()

  constructor(private walletLinkHost: WalletLinkHost, private secret: string) {}

  public listen() {
    window.addEventListener("message", this.handleMessage, false)
  }

  public destroy() {
    window.removeEventListener("message", this.handleMessage, false)
    this.subscriptions.unsubscribe()
  }

  @bind
  private handleMessage(message: MessageEvent): void {
    const { origin, data } = message

    if (
      !data ||
      !data.request ||
      typeof data.request.method !== "string" ||
      typeof data.request.params !== "object"
    ) {
      return
    }

    const request = {
      ...data.request,
      url: origin
    }
    const encrypted = aes256gcm.encrypt(JSON.stringify(request), this.secret)
    console.log("Sending:", request)

    this.subscriptions.add(
      this.walletLinkHost
        .publishEvent("Web3Request", encrypted)
        .pipe(
          flatMap(eventId =>
            this.walletLinkHost.incomingEvent$.pipe(
              filter(m => m.eventId === eventId)
            )
          ),
          catchError(err => {
            console.log(err)
            return of(undefined)
          })
        )
        .subscribe()
    )
  }
}

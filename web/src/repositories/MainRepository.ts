// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { BehaviorSubject, Observable, Subscription } from "rxjs"
import { filter, map, take } from "rxjs/operators"
import * as aes256gcm from "../lib/aes256gcm"
import { Session } from "../models/Session"
import { postMessageToOpener, postMessageToParent } from "../WalletLink/ipc"
import { LinkedMessage } from "../WalletLink/types/LinkedMessage"
import { UnlinkedMessage } from "../WalletLink/types/UnlinkedMessage"
import { Web3DenyAddressesMessage } from "../WalletLink/types/Web3DenyAddressesMessage"
import { Web3RevealAddressesMessage } from "../WalletLink/types/Web3RevealAddressesMessage"
import { WalletLinkHost } from "../WalletLink/WalletLinkHost"
import { WalletLinkWeb3Handler } from "../WalletLink/WalletLinkWeb3Handler"

export interface MainRepositoryOptions {
  webUrl: string
  serverUrl: string
  session?: Session
  walletLinkHost?: WalletLinkHost
  web3Handler?: WalletLinkWeb3Handler
}

export class MainRepository {
  private readonly _webUrl: string
  private readonly _serverUrl: string
  private readonly session: Session
  private readonly walletLinkHost: WalletLinkHost
  private readonly web3Handler: WalletLinkWeb3Handler
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

    const web3Handler =
      options.web3Handler ||
      new WalletLinkWeb3Handler(walletLinkHost, session.secret)
    this.web3Handler = web3Handler

    walletLinkHost.connect()
    web3Handler.listen()

    this.subscriptions.add(
      walletLinkHost.linked$.subscribe(linked => {
        if (linked) {
          postMessageToParent(LinkedMessage())
        }
      })
    )

    this.subscriptions.add(
      Session.persistedSessionIdChange$.subscribe(change => {
        if (change.oldValue && !change.newValue) {
          postMessageToParent(UnlinkedMessage())
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
  }

  public destroy(): void {
    this.subscriptions.unsubscribe()
    this.walletLinkHost.destroy()
    this.web3Handler.destroy()
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

  public revealEthereumAddressesToOpener(origin: string): Observable<void> {
    return this.ethereumAddressesSubject.pipe(
      filter(addrs => addrs.length > 0),
      take(1),
      map(addresses => {
        const message = Web3RevealAddressesMessage({ addresses })
        postMessageToOpener(message, origin)
      })
    )
  }

  public denyEthereumAddressesFromOpener(origin: string): void {
    const message = Web3DenyAddressesMessage()
    postMessageToOpener(message, origin)
  }
}

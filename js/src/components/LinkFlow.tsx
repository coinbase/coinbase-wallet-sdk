// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { h, render } from "preact"
import { BehaviorSubject, Observable, Subscription } from "rxjs"
import { LinkDialog } from "./LinkDialog"
import { first } from "rxjs/operators"
import { TryExtensionLinkDialog } from "./TryExtensionLinkDialog"

export interface LinkFlowOptions {
  darkMode: boolean
  version: string
  sessionId: string
  sessionSecret: string
  walletLinkUrl: string
  isParentConnection: boolean
  connected$: Observable<boolean>
}

interface Optional<T> {
  value?: T
}

export class LinkFlow {
  private readonly darkMode: boolean
  private readonly version: string
  private readonly sessionId: string
  private readonly sessionSecret: string
  private readonly walletLinkUrl: string
  private readonly isParentConnection: boolean

  private readonly connected$: Observable<boolean>
  private readonly extensionUI$: BehaviorSubject<
    Optional<boolean>
  > = new BehaviorSubject({})
  private readonly subscriptions = new Subscription()

  private isConnected = false
  private isOpen = false
  private onCancel: (() => void) | null = null

  private root: Element | null = null

  // if true, hide QR code in LinkFlow (which happens if no jsonRpcUrl is provided)
  private connectDisabled = false

  constructor(options: Readonly<LinkFlowOptions>) {
    this.darkMode = options.darkMode
    this.version = options.version
    this.sessionId = options.sessionId
    this.sessionSecret = options.sessionSecret
    this.walletLinkUrl = options.walletLinkUrl
    this.isParentConnection = options.isParentConnection
    this.connected$ = options.connected$

    // Check if extension UI is enabled
    fetch("https://api.wallet.coinbase.com/rpc/v2/getFeatureFlags")
      .then(res => res.json())
      .then(json => {
        const enabled: boolean | undefined = json.result.desktop.extension_ui
        if (typeof enabled === "undefined") {
          this.extensionUI$.next({ value: false })
        } else {
          this.extensionUI$.next({ value: enabled })
        }
      })
      .catch(_ => {
        this.extensionUI$.next({ value: false })
      })
  }

  public attach(el: Element): void {
    this.root = document.createElement("div")
    this.root.className = "-walletlink-link-flow-root"
    el.appendChild(this.root)
    this.render()

    this.subscriptions.add(
      this.connected$.subscribe(v => {
        if (this.isConnected !== v) {
          this.isConnected = v
          this.render()
        }
      })
    )
  }

  public detach(): void {
    if (!this.root) {
      return
    }
    this.subscriptions.unsubscribe()
    render(null, this.root)
    this.root.parentElement?.removeChild(this.root)
  }

  public setConnectDisabled(connectDisabled: boolean) {
    this.connectDisabled = connectDisabled
  }

  public open(options: { onCancel: () => void }): void {
    this.isOpen = true
    this.onCancel = options.onCancel
    this.render()
  }

  public close(): void {
    this.isOpen = false
    this.onCancel = null
    this.render()
  }

  private render(): void {
    if (!this.root) {
      return
    }

    const subscription = this.extensionUI$
      .pipe(first(enabled => enabled.value !== undefined)) // wait for a valid value before rendering
      .subscribe(enabled => {
        if (!this.root) {
          return
        }

        render(
          enabled.value! ? (
            <TryExtensionLinkDialog
              darkMode={this.darkMode}
              version={this.version}
              sessionId={this.sessionId}
              sessionSecret={this.sessionSecret}
              walletLinkUrl={this.walletLinkUrl}
              isOpen={this.isOpen}
              isConnected={this.isConnected}
              isParentConnection={this.isParentConnection}
              onCancel={this.onCancel}
              connectDisabled={this.connectDisabled}
            />
          ) : (
            <LinkDialog
              darkMode={this.darkMode}
              version={this.version}
              sessionId={this.sessionId}
              sessionSecret={this.sessionSecret}
              walletLinkUrl={this.walletLinkUrl}
              isOpen={this.isOpen}
              isConnected={this.isConnected}
              isParentConnection={this.isParentConnection}
              onCancel={this.onCancel}
            />
          ),
          this.root
        )
      })

    this.subscriptions.add(subscription)
  }
}

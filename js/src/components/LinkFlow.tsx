// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { h, render } from "preact"
import { Observable, Subscription } from "rxjs"
import { LinkDialog } from "./LinkDialog"

export interface LinkFlowOptions {
  darkMode: boolean
  version: string
  sessionId: string
  sessionSecret: string
  walletLinkUrl: string
  connected$: Observable<boolean>
}

export class LinkFlow {
  private readonly darkMode: boolean
  private readonly version: string
  private readonly sessionId: string
  private readonly sessionSecret: string
  private readonly walletLinkUrl: string

  private readonly connected$: Observable<boolean>
  private readonly subscriptions = new Subscription()

  private isConnected = false
  private isOpen = false
  private onCancel: (() => void) | null = null

  private root: Element | null = null

  constructor(options: Readonly<LinkFlowOptions>) {
    this.darkMode = options.darkMode
    this.version = options.version
    this.sessionId = options.sessionId
    this.sessionSecret = options.sessionSecret
    this.walletLinkUrl = options.walletLinkUrl
    this.connected$ = options.connected$
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

    render(
      <LinkDialog
        darkMode={this.darkMode}
        version={this.version}
        sessionId={this.sessionId}
        sessionSecret={this.sessionSecret}
        walletLinkUrl={this.walletLinkUrl}
        isOpen={this.isOpen}
        isConnected={this.isConnected}
        onCancel={this.onCancel}
      />,
      this.root
    )
  }
}

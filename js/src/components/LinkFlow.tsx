// Copyright (c) 2018-2020 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { h, render } from "preact"
import { Observable, Subscription } from "rxjs"
import { LinkDialog } from "./LinkDialog"

export interface LinkFlowOptions {
  version: string
  sessionId: string
  sessionSecret: string
  walletLinkUrl: string
  connected$: Observable<boolean>
  onceLinked$: Observable<void>
}

export class LinkFlow {
  private readonly version: string
  private readonly sessionId: string
  private readonly sessionSecret: string
  private readonly walletLinkUrl: string

  private readonly connected$: Observable<boolean>
  private readonly onceLinked$: Observable<void>
  private readonly subscriptions = new Subscription()

  private isConnected = false
  private isOpen = false
  private isLinked = false

  private root: Element | null = null

  constructor(options: Readonly<LinkFlowOptions>) {
    this.version = options.version
    this.sessionId = options.sessionId
    this.sessionSecret = options.sessionSecret
    this.walletLinkUrl = options.walletLinkUrl
    this.connected$ = options.connected$
    this.onceLinked$ = options.onceLinked$
  }

  public attach(el: Element): void {
    this.root = document.createElement("div")
    this.root.className = "-walletlink-link-flow-root"
    el.appendChild(this.root)
    this.render()
  }

  public open(): void {
    this.subscriptions.add(
      this.connected$.subscribe(v => {
        this.isConnected = v
        this.render()
      })
    )

    this.subscriptions.add(
      this.onceLinked$.subscribe(_ => {
        this.isLinked = true
        this.render()
      })
    )

    this.isOpen = true
    this.render()
  }

  public close(): void {
    this.subscriptions.unsubscribe()
    this.isOpen = false
    this.render()
  }

  private render(): void {
    if (!this.root) {
      return
    }

    render(
      <LinkDialog
        version={this.version}
        sessionId={this.sessionId}
        sessionSecret={this.sessionSecret}
        walletLinkUrl={this.walletLinkUrl}
        isOpen={this.isOpen}
        isConnected={this.isConnected}
        isLinked={this.isLinked}
      />,
      this.root
    )
  }
}

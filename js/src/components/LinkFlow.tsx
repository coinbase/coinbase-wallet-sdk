// Copyright (c) 2018-2020 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { h, render } from "preact"
import { LinkDialog } from "./LinkDialog"

export interface LinkFlowOptions {
  version: string
  sessionId: string
  sessionSecret: string
  walletLinkUrl: string
}

export class LinkFlow {
  private readonly version: string
  private readonly sessionId: string
  private readonly sessionSecret: string
  private readonly walletLinkUrl: string

  private root: Element | null = null

  constructor(options: Readonly<LinkFlowOptions>) {
    this.version = options.version
    this.sessionId = options.sessionId
    this.sessionSecret = options.sessionSecret
    this.walletLinkUrl = options.walletLinkUrl
  }

  public attach(el: Element): void {
    this.root = document.createElement("div")
    this.root.className = "-walletlink-link-flow-root"
    el.appendChild(this.root)

    render(
      <LinkDialog
        version={this.version}
        sessionId={this.sessionId}
        sessionSecret={this.sessionSecret}
        walletLinkUrl={this.walletLinkUrl}
      />,
      this.root
    )
  }

  public close(): void {}
}

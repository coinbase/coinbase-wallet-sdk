// Copyright (c) 2018-2020 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { FunctionComponent, h, render } from "preact"
import css from "./LinkDialog.css"
import { QRCode } from "./QRCode"

export interface LinkDialogOptions {
  version: string
}

export class LinkDialog {
  private readonly version: string
  private root: Element | null = null

  constructor(options: Readonly<LinkDialogOptions>) {
    this.version = options.version
  }

  public attach(el: Element): void {
    this.root = document.createElement("div")
    this.root.className = "-walletlink-link-dialog-root"
    el.appendChild(this.root)

    render(<LinkDialogContainer version={this.version} />, this.root)
  }

  public close(): void {}
}

const LinkDialogContainer: FunctionComponent<{ version: string }> = props => (
  <div class="-walletlink-link-dialog-container">
    <style>{css}</style>
    <div class="-walletlink-link-dialog-backdrop" />
    <div class="-walletlink-link-dialog">
      <LinkDialogBox version={props.version} />
    </div>
  </div>
)

const LinkDialogBox: FunctionComponent<{ version: string }> = props => {
  return (
    <div class="-walletlink-link-dialog-box">
      <div class="-walletlink-link-dialog-box-content">
        <h3>Scan QR Code</h3>
        <h4>to connect mobile wallet</h4>

        <div class="-walletlink-link-dialog-box-content-qrcode">
          <QRCode content="hello world" width={224} height={224} />
        </div>

        <ol>
          <li>Open compatible wallet app</li>
          <li>Find and open the QR scanner</li>
          <li>Scan this QR code</li>
        </ol>
      </div>

      <div class="-walletlink-link-dialog-box-footer">
        <p>Powered by WalletLink</p>
        <small>v{props.version}</small>
      </div>
    </div>
  )
}

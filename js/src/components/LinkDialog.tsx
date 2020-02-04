// Copyright (c) 2018-2020 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { FunctionComponent, h } from "preact"
import css from "./LinkDialog.css"
import { QRCode } from "./QRCode"

export const LinkDialog: FunctionComponent<{
  version: string
  sessionId: string
  sessionSecret: string
  walletLinkUrl: string
}> = props => (
  <div class="-walletlink-link-dialog-container">
    <style>{css}</style>
    <div class="-walletlink-link-dialog-backdrop" />
    <div class="-walletlink-link-dialog">
      <div class="-walletlink-link-dialog-box">
        <div class="-walletlink-link-dialog-box-content">
          <ScanQRCode
            sessionId={props.sessionId}
            sessionSecret={props.sessionSecret}
            walletLinkUrl={props.walletLinkUrl}
          />
        </div>

        <div class="-walletlink-link-dialog-box-footer">
          <p>Powered by WalletLink</p>
          <small>v{props.version}</small>
        </div>
      </div>
    </div>
  </div>
)

const ScanQRCode: FunctionComponent<{
  sessionId: string
  sessionSecret: string
  walletLinkUrl: string
}> = props => {
  const serverUrl = window.encodeURIComponent(props.walletLinkUrl)
  const qrUrl = `${props.walletLinkUrl}/#/link?id=${props.sessionId}&secret=${props.sessionSecret}&server=${serverUrl}`

  return (
    <div class="-walletlink-link-dialog-box-content">
      <h3>Scan QR Code</h3>
      <h4>to connect mobile wallet</h4>

      <div class="-walletlink-link-dialog-box-content-qrcode">
        <QRCode content={qrUrl} width={224} height={224} />
        <input type="hidden" value={qrUrl} />
      </div>

      <ol>
        <li>Open compatible wallet app</li>
        <li>Find and open the QR scanner</li>
        <li>Scan this QR code</li>
      </ol>
    </div>
  )
}

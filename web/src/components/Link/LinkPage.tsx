// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { style } from "typestyle"
import { PopUpFrame } from "../PopUpFrame"
import { SessionQRCode } from "./SessionQRCode"

const styles = {
  title: style({
    fontSize: 20,
    marginTop: 0,
    marginBottom: 0
  }),
  subtitle: style({
    fontSize: 13,
    fontWeight: "normal",
    opacity: 0.8,
    marginTop: 0,
    marginBottom: 16
  }),
  instructions: style({
    marginTop: 16,
    marginBottom: 16,
    padding: 0,
    listStylePosition: "inside",
    fontSize: 13,
    lineHeight: 1.5,
    textAlign: "left"
  })
}

export interface Props {
  webUrl: string
  serverUrl: string
  sessionId: string
  sessionSecret: string
}

export class LinkPage extends React.PureComponent<Props> {
  public render() {
    const { webUrl, serverUrl, sessionId, sessionSecret } = this.props

    return (
      <PopUpFrame>
        <h3 className={styles.title}>Scan QR Code</h3>
        <h4 className={styles.subtitle}>To connect mobile wallet</h4>

        <SessionQRCode
          webUrl={webUrl}
          serverUrl={serverUrl}
          sessionId={sessionId}
          sessionSecret={sessionSecret}
        />

        <ol className={styles.instructions}>
          <li>Open compatible wallet app</li>
          <li>Find and open the QR scanner</li>
          <li>Scan this QR code</li>
        </ol>
      </PopUpFrame>
    )
  }
}

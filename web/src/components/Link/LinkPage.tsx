// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { style } from "typestyle"
import { colors } from "../../colors"
import { SessionQRCode } from "./SessionQRCode"

export interface Props {
  webUrl: string
  serverUrl: string
  sessionId: string
  sessionSecret: string
}

const styles = {
  main: style({
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    textAlign: "center",
    color: colors.foreground,
    justifyContent: "space-between",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }),
  background: style({
    zIndex: -1,
    position: "fixed",
    backgroundColor: colors.background,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }),
  content: style({
    width: 256,
    marginLeft: "auto",
    marginRight: "auto"
  }),
  title: style({
    fontSize: 20,
    marginTop: 16,
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
  }),
  footer: style({
    marginTop: 16,
    $nest: {
      "&::before": {
        display: "block",
        content: `""`,
        height: 1,
        background: colors.foreground,
        opacity: 0.1
      }
    }
  }),
  powered: style({
    fontSize: 13,
    margin: 0,
    padding: 16,
    textAlign: "center",
    opacity: 0.5
  })
}

export class LinkPage extends React.PureComponent<Props> {
  public render() {
    const { webUrl, serverUrl, sessionId, sessionSecret } = this.props

    return (
      <div className={styles.main}>
        <div className={styles.background} />

        <div className={styles.content}>
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
        </div>

        <div className={styles.footer}>
          <h5 className={styles.powered}>Powered by WalletLink</h5>
        </div>
      </div>
    )
  }
}

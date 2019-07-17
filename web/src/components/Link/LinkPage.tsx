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
    paddingTop: 16,
    textAlign: "center",
    color: "white"
  }),
  background: style({
    zIndex: -1,
    position: "fixed",
    backgroundColor: colors.primary,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }),
  title: style({
    fontSize: 20,
    marginTop: 4,
    marginBottom: 16
  }),
  content: style({
    width: 256,
    marginTop: 16,
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "left"
  }),
  instructions: style({
    margin: 0,
    padding: 0,
    listStylePosition: "inside",
    fontSize: 13,
    lineHeight: 1.5
  }),
  compatibleAppListTitle: style({
    fontSize: 13,
    fontWeight: "normal",
    opacity: 0.5,
    marginTop: 16,
    marginBottom: 8
  }),
  compatibleAppList: style({
    margin: 0,
    padding: 0,
    listStyle: "none",
    fontSize: 13,
    fontWeight: "bold"
  }),
  compatibleAppListItem: style({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8
  }),
  compatibleAppIcon: style({
    display: "flex",
    backgroundColor: "white",
    width: 32,
    height: 32,
    marginRight: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  }),
  compatibleAppIconImage: style({
    width: 22,
    height: 22
  }),
  powered: style({
    opacity: 0.5,
    fontSize: 13,
    textAlign: "center"
  })
}

const images = {
  coinbaseWallet: require("../../images/coinbase-wallet.svg")
}

export class LinkPage extends React.PureComponent<Props> {
  public render() {
    const { webUrl, serverUrl, sessionId, sessionSecret } = this.props

    return (
      <div className={styles.main}>
        <div className={styles.background} />

        <h3 className={styles.title}>Scan QR Code</h3>

        <SessionQRCode
          webUrl={webUrl}
          serverUrl={serverUrl}
          sessionId={sessionId}
          sessionSecret={sessionSecret}
        />

        <div className={styles.content}>
          <ol className={styles.instructions}>
            <li>Open compatible wallet app</li>
            <li>Find and open the QR scanner</li>
            <li>Scan this QR code</li>
          </ol>

          <h4 className={styles.compatibleAppListTitle}>Compatible Wallets</h4>
          <ul className={styles.compatibleAppList}>
            <li className={styles.compatibleAppListItem}>
              <div className={styles.compatibleAppIcon}>
                <img
                  className={styles.compatibleAppIconImage}
                  src={images.coinbaseWallet}
                  alt=""
                />
              </div>
              <span>Coinbase Wallet</span>
            </li>
          </ul>

          <h5 className={styles.powered}>Powered by WalletLink</h5>
        </div>
      </div>
    )
  }
}

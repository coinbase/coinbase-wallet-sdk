// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { style } from "typestyle"
import { colors } from "../colors"

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
    flexGrow: 1,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    width: 256,
    marginLeft: "auto",
    marginRight: "auto",
    paddingTop: 16,
    paddingBottom: 16
  }),
  footer: style({
    flexGrow: 0,
    flexShrink: 0,
    $nest: {
      "&::before": {
        display: "block",
        content: "''",
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

export class PopUpFrame extends React.PureComponent {
  public render() {
    return (
      <div className={styles.main}>
        <div className={styles.background} />
        <div className={styles.content}>{this.props.children}</div>
        <div className={styles.footer}>
          <h5 className={styles.powered}>Powered by WalletLink</h5>
        </div>
      </div>
    )
  }
}

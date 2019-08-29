// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import React, { MouseEvent } from "react"
import { style } from "typestyle"
import { PopUpFrame } from "../PopUpFrame"

const styles = {
  title: style({
    fontSize: 20,
    marginTop: 32,
    marginBottom: 0
  }),
  para: style({
    marginTop: 16,
    fontSize: 13,
    lineHeight: 1.5,
    opacity: 0.8
  }),
  reconnectButton: style({
    display: "inline",
    "-webkit-appearance": "none",
    textDecoration: "underline",
    borderWidth: 0,
    padding: 0,
    fontSize: 13,
    backgroundColor: "transparent",
    color: "#1652f0",
    "-webkit-text-fill-color": "#1652f0",
    cursor: "pointer"
  })
}

const images = {
  authorize: require("../../images/authorize.svg")
}

export interface Props {
  onClickReconnect: () => void
}

export class LinkedPage extends React.PureComponent<Props> {
  public render() {
    return (
      <PopUpFrame>
        <img src={images.authorize} alt="" />

        <h3 className={styles.title}>Authorize on Wallet App</h3>

        <p className={styles.para}>
          We&rsquo;ve sent a request to your mobile device. Check your Wallet
          app to continue.
        </p>

        <p className={styles.para}>
          Not receiving requests?{" "}
          <button
            className={styles.reconnectButton}
            onClick={this.handleClickReconnect}
          >
            Try Reconnecting
          </button>
        </p>
      </PopUpFrame>
    )
  }

  @bind
  public handleClickReconnect(e: MouseEvent): void {
    e.preventDefault()
    this.props.onClickReconnect()
  }
}

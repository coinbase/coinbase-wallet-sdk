// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
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
  })
}

const images = {
  authorize: require("../../images/authorize.svg")
}

export class LinkedPage extends React.PureComponent {
  public render() {
    return (
      <PopUpFrame>
        <img src={images.authorize} alt="" />

        <h3 className={styles.title}>Authorize on Wallet App</h3>

        <p className={styles.para}>
          We’ve sent a request to your phone. Check your Wallet app to continue.
        </p>
      </PopUpFrame>
    )
  }
}

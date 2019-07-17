// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { style } from "typestyle"

const styles = {
  main: style({
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    textAlign: "center",
    color: "black"
  }),
  content: style({
    width: 256,
    marginTop: 16,
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "center",
    lineHeight: 1.25
  }),
  title: style({
    fontSize: 20,
    marginTop: 32,
    marginBottom: 32
  }),
  para: style({
    marginTop: 16,
    marginBottom: 16,
    fontSize: 16
  })
}

const images = {
  success: require("../../images/success.svg")
}

export class LinkedPage extends React.PureComponent {
  public render() {
    return (
      <div className={styles.main}>
        <div className={styles.content}>
          <img src={images.success} alt="" />

          <h3 className={styles.title}>Connection Successful</h3>

          <p className={styles.para}>
            You&rsquo;ve successfully connected your mobile wallet.
          </p>
          <p className={styles.para}>
            To continue, please follow the instructions displayed in your mobile
            wallet.
          </p>
        </div>
      </div>
    )
  }
}

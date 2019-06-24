// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { Link } from "react-router-dom"
import { style as typestyle } from "typestyle"
import { routes } from "../../routes"

const styles = {
  main: typestyle({
    textAlign: "center"
  })
}

export class RootPage extends React.PureComponent {
  public render() {
    return (
      <div className={styles.main}>
        <p>WalletLink</p>
        <p>
          <Link to={routes.link}>Link your device</Link>
        </p>
      </div>
    )
  }
}

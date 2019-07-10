// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { style as typestyle } from "typestyle"

const styles = {
  main: typestyle({
    textAlign: "center"
  })
}

export class RootPage extends React.PureComponent {
  public render() {
    return (
      <div className={styles.main}>
        <h1>WalletLink</h1>
      </div>
    )
  }
}

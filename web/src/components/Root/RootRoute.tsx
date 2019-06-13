// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { RouteComponentProps } from "react-router"
import { Link } from "react-router-dom"
import { style as typestyle } from "typestyle"

export interface Props extends RouteComponentProps {}

const style = typestyle({
  textAlign: "center"
})

export class RootRoute extends React.PureComponent<Props> {
  public render() {
    return (
      <div className={style}>
        <p>WalletLink</p>
        <p>
          <Link to="/link">Link your device</Link>
        </p>
      </div>
    )
  }
}

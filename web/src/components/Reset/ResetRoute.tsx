// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { RouteComponentProps } from "react-router"
import { Session } from "../../WalletLink/Session"

export class ResetRoute extends React.PureComponent<RouteComponentProps> {
  public componentDidMount() {
    Session.clear()
    window.close()
  }

  public render() {
    return null
  }
}

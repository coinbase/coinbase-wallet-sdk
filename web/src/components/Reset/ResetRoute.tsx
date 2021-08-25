// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { RouteComponentProps } from "react-router"
import { Session } from "../../WalletLink/Session"

export class ResetRoute extends React.PureComponent<RouteComponentProps> {
  public componentDidMount() {
    Session.clear()
  }

  public render() {
    return null
  }
}

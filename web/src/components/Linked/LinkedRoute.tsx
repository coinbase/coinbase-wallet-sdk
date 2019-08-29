// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import React from "react"
import { RouteComponentProps } from "react-router"
import { Subscription } from "rxjs"
import { routes } from "../../routes"
import { Session } from "../../WalletLink/Session"
import { AppContext } from "../AppContext"
import { LinkedPage } from "./LinkedPage"

export class LinkedRoute extends React.PureComponent<RouteComponentProps> {
  public static contextType = AppContext
  public context!: React.ContextType<typeof AppContext>

  private subscriptions = new Subscription()

  public componentDidMount() {
    const { mainRepo } = this.context
    const { history } = this.props

    if (mainRepo && !mainRepo.sessionLinked) {
      history.replace(routes.link)
    }
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()
  }

  public render() {
    const { mainRepo } = this.context
    return mainRepo ? (
      <LinkedPage onClickReconnect={this.handleClickReconnect} />
    ) : null
  }

  @bind
  public handleClickReconnect(): void {
    Session.clear()
  }
}

// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import React from "react"
import { RouteComponentProps } from "react-router"
import { Subscription } from "rxjs"
import { Session } from "../../WalletLink/Session"
import { AppContext } from "../AppContext"
import { RootPage } from "./RootPage"

interface State {
  linked: boolean
}

export class RootRoute extends React.PureComponent<RouteComponentProps, State> {
  public static contextType = AppContext
  public context!: React.ContextType<typeof AppContext>

  public state: State = {
    linked: false
  }

  private subscriptions = new Subscription()

  public componentDidMount() {
    const { mainRepo } = this.context

    if (mainRepo) {
      this.setState({ linked: mainRepo.sessionLinked })

      this.subscriptions.add(
        mainRepo.linked$.subscribe(linked => {
          this.setState({ linked })
        })
      )
    }
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()
  }

  public render() {
    const { linked } = this.state

    return (
      <RootPage
        linked={linked}
        onClickDisconnect={this.handleClickDisconnect}
      />
    )
  }

  @bind
  public handleClickDisconnect(): void {
    Session.clear()
    document.location.reload()
  }
}

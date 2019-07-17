// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { RouteComponentProps } from "react-router"
import { fromEvent, Subscription } from "rxjs"
import { AppContext } from "../AppContext"
import { LinkPage } from "./LinkPage"

interface State {
  linked: boolean
}

export class LinkRoute extends React.PureComponent<RouteComponentProps, State> {
  public static contextType = AppContext
  public context!: React.ContextType<typeof AppContext>
  public state: State = {
    linked: false
  }

  private subscriptions = new Subscription()

  public componentDidMount() {
    const { mainRepo } = this.context

    this.subscriptions.add(
      mainRepo.linked$.subscribe(v => {
        this.setState({ linked: v })
      })
    )

    this.subscriptions.add(
      fromEvent(window, "unload").subscribe(() => {
        this.context.mainRepo.denyEthereumAddressesFromOpener()
      })
    )
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()
  }

  public render() {
    const { mainRepo } = this.context
    const { linked } = this.state

    return (
      <LinkPage
        webUrl={mainRepo.webUrl}
        serverUrl={mainRepo.serverUrl}
        sessionId={mainRepo.sessionId}
        sessionSecret={mainRepo.sessionSecret}
        linked={linked}
      />
    )
  }
}

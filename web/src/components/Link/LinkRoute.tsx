// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import React from "react"
import { RouteComponentProps } from "react-router"
import { Subscription } from "rxjs"
import { Session } from "../../models/Session"
import { routes } from "../../routes"
import { AppContext } from "../AppContext"
import { LinkPage } from "./LinkPage"

export class LinkRoute extends React.PureComponent<RouteComponentProps> {
  public static contextType = AppContext
  public context!: React.ContextType<typeof AppContext>

  private subscriptions = new Subscription()

  public componentDidMount() {
    const { mainRepo } = this.context

    this.subscriptions.add(
      mainRepo.onceLinked$.subscribe(() => {
        const { history } = this.props
        history.replace({
          pathname: routes.authorize,
          search: history.location.search
        })
      })
    )
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()
  }

  public render() {
    const { mainRepo } = this.context

    return (
      <LinkPage
        webUrl={mainRepo.webUrl}
        serverUrl={mainRepo.serverUrl}
        sessionId={mainRepo.sessionId}
        sessionSecret={mainRepo.sessionSecret}
        onClickUnlink={this.handleClickUnlink}
      />
    )
  }

  @bind
  private handleClickUnlink(): void {
    Session.clear()
    document.location.reload()
  }
}

// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import querystring from "querystring"
import React from "react"
import { RouteComponentProps } from "react-router"
import { fromEvent, Subscription } from "rxjs"
import { postMessageToParent } from "../../lib/util"
import { routes } from "../../routes"
import { LocalStorageBlockedMessage } from "../../WalletLink/types/LocalStorageBlockedMessage"
import { AppContext } from "../AppContext"
import { LinkPage } from "./LinkPage"

export class LinkRoute extends React.PureComponent<RouteComponentProps> {
  public static contextType = AppContext
  public context!: React.ContextType<typeof AppContext>

  private subscriptions = new Subscription()

  public componentDidMount() {
    const { mainRepo } = this.context
    const { history } = this.props

    const userSuppliedSessionId = querystring.parse(
      this.props.location.search.slice(1)
    ).id
    if (userSuppliedSessionId && userSuppliedSessionId !== mainRepo.sessionId) {
      postMessageToParent(LocalStorageBlockedMessage())
    }

    this.subscriptions.add(
      mainRepo.onceLinked$.subscribe(_ => {
        history.replace(routes.linked)
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

    return (
      <LinkPage
        webUrl={mainRepo.webUrl}
        serverUrl={mainRepo.serverUrl}
        sessionId={mainRepo.sessionId}
        sessionSecret={mainRepo.sessionSecret}
      />
    )
  }
}

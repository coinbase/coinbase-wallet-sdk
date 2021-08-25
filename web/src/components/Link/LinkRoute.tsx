// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
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
    const query = querystring.parse(
      this.props.location.search.slice(1)
    )

    if (!mainRepo) {
      return
    }

    if (!!query.v) {
      history.replace(routes.wallets)
      return
    }

    if (mainRepo.sessionLinked) {
      history.replace(routes.linked)
      return
    }

    const userSuppliedSessionId = query.id
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
        mainRepo.denyEthereumAddressesFromOpener()
      })
    )
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()
  }

  public render() {
    const { mainRepo } = this.context

    return mainRepo ? (
      <LinkPage
        webUrl={mainRepo.webUrl}
        serverUrl={mainRepo.serverUrl}
        sessionId={mainRepo.sessionId}
        sessionSecret={mainRepo.sessionSecret}
      />
    ) : null
  }
}

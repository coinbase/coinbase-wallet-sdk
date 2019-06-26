// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { fromEvent, Subscription } from "rxjs"
import { routes } from "../../routes"
import { AppContext } from "../AppContext"
import { RouteComponentPropsWithAppInfo } from "../routeWithAppInfo"
import { LinkPage } from "./LinkPage"

export class LinkRoute extends React.PureComponent<
  RouteComponentPropsWithAppInfo
> {
  public static contextType = AppContext
  public context!: React.ContextType<typeof AppContext>

  private subscriptions = new Subscription()

  public componentDidMount() {
    const { mainRepo } = this.context

    this.subscriptions.add(
      mainRepo.onceLinked$.subscribe(() => {
        if (this.props.appInfo.origin) {
          const { history } = this.props
          history.replace({
            pathname: routes.authorize,
            search: history.location.search
          })
        }
      })
    )

    this.subscriptions.add(
      fromEvent(window, "unload").subscribe(() => {
        this.context.mainRepo.denyEthereumAddressesFromOpener(
          this.props.appInfo.origin
        )
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
        hasNextStep={!!this.props.appInfo.origin}
      />
    )
  }
}

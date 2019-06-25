// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import React from "react"
import { Redirect } from "react-router"
import { fromEvent, Subscription } from "rxjs"
import { nextTick } from "../../lib/util"
import { routes } from "../../routes"
import * as appAuthorizations from "../../WalletLink/appAuthorizations"
import { AppContext } from "../AppContext"
import { RouteComponentPropsWithAppInfo } from "../routeWithAppInfo"
import { AuthorizePage } from "./AuthorizePage"

interface State {
  ethereumAddresses: string[]
}

export class AuthorizeRoute extends React.PureComponent<
  RouteComponentPropsWithAppInfo,
  State
> {
  public static contextType = AppContext
  public context!: React.ContextType<typeof AppContext>
  public state: State = {
    ethereumAddresses: []
  }

  private subscriptions = new Subscription()

  public componentDidMount() {
    const { mainRepo } = this.context

    this.subscriptions.add(
      mainRepo.ethereumAddresses$.subscribe(v => {
        this.setState({ ethereumAddresses: v })
      })
    )

    this.subscriptions.add(
      fromEvent(window, "unload").subscribe(() => {
        this.handleClickDontAllowButton()
      })
    )
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()
  }

  public render() {
    const { ethereumAddresses } = this.state
    const { appName, appLogoUrl, origin } = this.props.appInfo

    if (appAuthorizations.isOriginAuthorized(origin)) {
      this.handleClickAllowButton()
    }

    return appName && origin ? (
      <AuthorizePage
        appName={appName}
        appLogoUrl={appLogoUrl}
        origin={origin}
        disabled={ethereumAddresses.length === 0}
        onClickAllowButton={this.handleClickAllowButton}
        onClickDontAllowButton={this.handleClickDontAllowButton}
      />
    ) : (
      <Redirect to={routes.root} />
    )
  }

  @bind
  private handleClickAllowButton() {
    const { origin } = this.props.appInfo
    appAuthorizations.setOriginAuthorized(origin)

    const sub = this.context.mainRepo
      .revealEthereumAddressesToOpener(origin)
      .subscribe(() => nextTick(() => this.subscriptions.remove(sub)))
    this.subscriptions.add(sub)
  }

  @bind
  private handleClickDontAllowButton() {
    this.context.mainRepo.denyEthereumAddressesFromOpener(
      this.props.appInfo.origin
    )
  }
}

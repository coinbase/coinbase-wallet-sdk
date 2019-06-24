// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import querystring from "querystring"
import React from "react"
import { Redirect, RouteComponentProps } from "react-router"
import { Subscription } from "rxjs"
import { nextTick } from "../../lib/util"
import { routes } from "../../routes"
import { AppContext } from "../AppContext"
import { AuthorizePage } from "./AuthorizePage"

interface State {
  ethereumAddresses: string[]
}

interface AppInfo {
  appName: string
  appLogoUrl: string
  origin: string
}

export class AuthorizeRoute extends React.PureComponent<
  RouteComponentProps,
  State
> {
  public static contextType = AppContext
  public context!: React.ContextType<typeof AppContext>
  public state: State = {
    ethereumAddresses: []
  }

  private subscriptions = new Subscription()
  private appInfo: AppInfo = {
    appName: "",
    appLogoUrl: "",
    origin: ""
  }

  public componentDidMount() {
    const { mainRepo } = this.context

    this.subscriptions.add(
      mainRepo.ethereumAddresses$.subscribe(v => {
        this.setState({ ethereumAddresses: v })
      })
    )
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()
  }

  public render() {
    const { ethereumAddresses } = this.state
    this.appInfo = this.parseQuery()
    const { appName, appLogoUrl, origin } = this.appInfo

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
    const sub = this.context.mainRepo
      .revealEthereumAddressesToOpener(this.appInfo.origin)
      .subscribe(() => nextTick(() => this.subscriptions.remove(sub)))
    this.subscriptions.add(sub)
  }

  @bind
  private handleClickDontAllowButton() {
    this.context.mainRepo.denyEthereumAddressesFromOpener(this.appInfo.origin)
  }

  private parseQuery(): AppInfo {
    const query = querystring.parse(this.props.location.search.slice(1))
    const { appName, appLogoUrl, origin } = query
    return {
      appName: firstValue(appName),
      appLogoUrl: firstValue(appLogoUrl),
      origin: firstValue(origin)
    }
  }
}

function firstValue(val: string[] | string): string {
  return (Array.isArray(val) ? val[0] : val) || ""
}

// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { RouteComponentProps } from "react-router"
import { Subscription } from "rxjs"
import { take } from "rxjs/operators"
import { routes } from "../../routes"
import { AppContext } from "../AppContext"
import { LinkedPage } from "./LinkedPage"

export class LinkedRoute extends React.PureComponent<RouteComponentProps> {
  public static contextType = AppContext
  public context!: React.ContextType<typeof AppContext>

  private subscriptions = new Subscription()

  public componentDidMount() {
    const { mainRepo } = this.context
    const { history } = this.props

    this.subscriptions.add(
      mainRepo.linked$.pipe(take(1)).subscribe(linked => {
        if (!linked) {
          history.replace(routes.link)
        }
      })
    )
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()
  }

  public render() {
    return <LinkedPage />
  }
}

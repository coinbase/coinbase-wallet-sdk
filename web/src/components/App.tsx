// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { createHashHistory } from "history"
import React from "react"
import { Route, Router } from "react-router-dom"
import { SERVER_URL, WEB_URL } from "../config"
import { MainRepository } from "../repositories/MainRepository"
import { routes } from "../routes"
import { AppContext } from "./AppContext"
import { AuthorizeRoute } from "./Authorize/AuthorizeRoute"
import { LinkRoute } from "./Link/LinkRoute"
import { ResetRoute } from "./Reset/ResetRoute"
import { RootRoute } from "./Root/RootRoute"

export class App extends React.PureComponent {
  private readonly history = createHashHistory()

  private mainRepo = new MainRepository({
    serverUrl: SERVER_URL,
    webUrl: WEB_URL
  })

  public render() {
    return (
      <AppContext.Provider value={{ mainRepo: this.mainRepo }}>
        <Router history={this.history}>
          <Route exact path={routes.root} component={RootRoute} />
          <Route exact path={routes.link} component={LinkRoute} />
          <Route exact path={routes.reset} component={ResetRoute} />
          <Route exact path={routes.authorize} component={AuthorizeRoute} />
        </Router>
      </AppContext.Provider>
    )
  }
}

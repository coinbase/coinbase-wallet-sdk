// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { RouteComponentProps } from "react-router"
import { RootPage } from "./RootPage"

export class RootRoute extends React.PureComponent<RouteComponentProps> {
  public render() {
    return <RootPage />
  }
}

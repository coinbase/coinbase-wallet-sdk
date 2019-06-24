// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import React from "react"
import { RouteComponentProps } from "react-router"
import { Session } from "../../models/Session"
import { LinkPage } from "./LinkPage"

export interface Props extends RouteComponentProps {
  connected: boolean
  linked: boolean
  webUrl: string
  serverUrl: string
  sessionId: string
  sessionSecret: string
}

export class LinkRoute extends React.PureComponent<Props> {
  public render() {
    const { webUrl, serverUrl, sessionId, sessionSecret } = this.props

    return (
      <LinkPage
        webUrl={webUrl}
        serverUrl={serverUrl}
        sessionId={sessionId}
        sessionSecret={sessionSecret}
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

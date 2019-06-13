// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import React, { MouseEvent } from "react"
import { RouteComponentProps } from "react-router"
import { style as typestyle } from "typestyle"
import { Session } from "../../models/Session"
import { SessionQRCode } from "./SessionQRCode"

export interface Props extends RouteComponentProps {
  connected: boolean
  linked: boolean
  webUrl: string
  serverUrl: string
  sessionId: string
  sessionSecret: string
}

const style = typestyle({
  textAlign: "center"
})

export class LinkRoute extends React.PureComponent<Props> {
  public render() {
    const {
      connected,
      linked,
      webUrl,
      serverUrl,
      sessionId,
      sessionSecret
    } = this.props

    return (
      <div className={style}>
        <p>WalletLink</p>
        <SessionQRCode
          webUrl={webUrl}
          serverUrl={serverUrl}
          sessionId={sessionId}
          sessionSecret={sessionSecret}
        />
        <p>{connected ? "Connected" : "Disconnected"}</p>
        <p>{linked ? "Linked" : "Not Linked"}</p>

        <button onClick={this.handleClickUnlink}>Unlink</button>
      </div>
    )
  }

  @bind
  private handleClickUnlink(evt: MouseEvent): void {
    evt.preventDefault()

    Session.clear()
    document.location.reload()
  }
}

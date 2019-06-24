// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import React, { MouseEvent } from "react"
import { style } from "typestyle"
import { SessionQRCode } from "./SessionQRCode"

export interface Props {
  webUrl: string
  serverUrl: string
  sessionId: string
  sessionSecret: string
  onClickUnlink: () => void
}

const styles = {
  main: style({
    textAlign: "center"
  }),
  unlink: style({
    marginTop: 32
  })
}

export class LinkPage extends React.PureComponent<Props> {
  public render() {
    const { webUrl, serverUrl, sessionId, sessionSecret } = this.props

    return (
      <div className={styles.main}>
        <p>WalletLink</p>

        <SessionQRCode
          webUrl={webUrl}
          serverUrl={serverUrl}
          sessionId={sessionId}
          sessionSecret={sessionSecret}
        />

        <div className={styles.unlink}>
          <button onClick={this.handleClickUnlink}>Unlink</button>
        </div>
      </div>
    )
  }

  @bind
  private handleClickUnlink(evt: MouseEvent): void {
    evt.preventDefault()
    this.props.onClickUnlink()
  }
}

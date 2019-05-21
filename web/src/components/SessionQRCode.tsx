// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import QRCode from "qrcode.react"
import React from "react"
import { style } from "typestyle"

const styleSessionQRCode = style({
  borderRadius: 8,
  boxShadow: "0 5px 10px rgba(0, 0, 0, .2)",
  display: "inline-block",
  padding: 16
})

const styleSessionId = style({
  display: "block",
  fontSize: 9,
  width: "100%"
})

export interface Props {
  hostname: string
  sessionId: string
  sessionSecret: string
}

export class SessionQRCode extends React.PureComponent<Props> {
  public render() {
    const { hostname, sessionId, sessionSecret } = this.props
    const url = `${hostname}/#/joinSession?id=${sessionId}&secret=${sessionSecret}`

    return (
      <div className={styleSessionQRCode}>
        <QRCode value={url} renderAs="svg" size={196} />
        <code className={styleSessionId}>{sessionId}</code>
        <input type="hidden" value={url} readOnly />
      </div>
    )
  }
}

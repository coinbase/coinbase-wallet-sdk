// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import QRCode from "qrcode.react"
import querystring from "querystring"
import React from "react"
import { style } from "typestyle"
import { routes } from "../../routes"

const styles = {
  main: style({
    borderRadius: 8,
    backgroundColor: "white",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
    display: "inline-block",
    padding: 16
  }),
  qrUrl: style({
    display: "block",
    width: "100%"
  })
}

export interface Props {
  webUrl: string
  serverUrl: string
  sessionId: string
  sessionSecret: string
}

export class SessionQRCode extends React.PureComponent<Props> {
  public render() {
    const { webUrl, serverUrl, sessionId, sessionSecret } = this.props
    const queryParams = {
      id: sessionId,
      secret: sessionSecret,
      server: serverUrl
    }
    const url = `${webUrl}/#${routes.link}?${querystring.stringify(
      queryParams
    )}`

    return (
      <div className={styles.main}>
        <QRCode
          value={url}
          renderAs="svg"
          size={224}
          bgColor="white"
          fgColor="black"
        />
        <input className={styles.qrUrl} type="hidden" value={url} readOnly />
      </div>
    )
  }
}

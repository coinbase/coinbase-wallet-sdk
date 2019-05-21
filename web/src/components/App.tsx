// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React, { useEffect } from "react"
import { style } from "typestyle"
import { Session } from "../models/Session"
import { WalletLinkHost } from "../WalletLink/WalletLinkHost"
import { WalletLinkMessageHandler } from "../WalletLink/WalletLinkMessageHandler"
import { SessionQRCode } from "./SessionQRCode"

const WEB_HOST = "http://localhost:3000"
const RPC_URL = "ws://localhost:8080/rpc"

const session = Session.load() || new Session().save()
const walletLinkHost = new WalletLinkHost(session.id, session.key, RPC_URL)
const walletLinkMessageHandler = new WalletLinkMessageHandler(
  walletLinkHost,
  session.secret
)

const styleApp = style({
  textAlign: "center"
})

const App: React.FC = () => {
  useEffect(() => {
    walletLinkHost.connect()
    walletLinkMessageHandler.listen()
    return () => {
      walletLinkHost.destroy()
      walletLinkMessageHandler.destroy()
    }
  }, [])

  return (
    <div className={styleApp}>
      <p>WalletLink</p>
      <SessionQRCode
        hostname={WEB_HOST}
        sessionId={session.id}
        sessionSecret={session.secret}
      />
    </div>
  )
}

export default App

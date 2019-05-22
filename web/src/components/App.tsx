// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { Subscription } from "rxjs"
import { style } from "typestyle"
import { Session } from "../models/Session"
import { WalletLinkHost } from "../WalletLink/WalletLinkHost"
import { WalletLinkMessageHandler } from "../WalletLink/WalletLinkMessageHandler"
import { SessionQRCode } from "./SessionQRCode"

const WEB_URL = "http://localhost:3000"
const RPC_URL = "ws://localhost:8080/rpc"

const styleApp = style({
  textAlign: "center"
})

type State = Readonly<{
  connected: boolean
  linked: boolean
}>

export class App extends React.PureComponent<{}, State> {
  private session = Session.load() || new Session().save()
  private walletLinkHost: WalletLinkHost | null = null
  private walletLinkMessageHandler: WalletLinkMessageHandler | null = null
  private subscriptions = new Subscription()

  public state: State = {
    connected: false,
    linked: false
  }

  public componentDidMount() {
    const { session } = this
    const walletLinkHost = (this.walletLinkHost = new WalletLinkHost(
      session.id,
      session.key,
      RPC_URL
    ))
    const walletLinkMessageHandler = (this.walletLinkMessageHandler = new WalletLinkMessageHandler(
      walletLinkHost,
      session.secret
    ))

    walletLinkHost.connect()
    walletLinkMessageHandler.listen()

    this.subscriptions.add(
      walletLinkHost.connected$.subscribe(v => this.setState({ connected: v }))
    )
    this.subscriptions.add(
      walletLinkHost.linked$.subscribe(v => this.setState({ linked: v }))
    )
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()

    if (this.walletLinkHost) {
      this.walletLinkHost.destroy()
      this.walletLinkHost = null
    }
    if (this.walletLinkMessageHandler) {
      this.walletLinkMessageHandler.destroy()
      this.walletLinkMessageHandler = null
    }
  }

  public render() {
    const { session } = this
    const { connected, linked } = this.state

    return (
      <div className={styleApp}>
        <p>WalletLink</p>
        <SessionQRCode
          webUrl={WEB_URL}
          rpcUrl={RPC_URL}
          sessionId={session.id}
          sessionSecret={session.secret}
        />
        <p>{connected ? "Connected" : "Disconnected"}</p>
        <p>{linked ? "Linked" : "Not Linked"}</p>
      </div>
    )
  }
}

// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import React, { MouseEvent } from "react"
import { Subscription } from "rxjs"
import { style } from "typestyle"
import { RPC_URL, WEB_URL } from "../config"
import { Session } from "../models/Session"
import { WalletLinkHost } from "../WalletLink/WalletLinkHost"
import { WalletLinkWeb3Handler } from "../WalletLink/WalletLinkWeb3Handler"
import { SessionQRCode } from "./SessionQRCode"

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
  private web3Handler: WalletLinkWeb3Handler | null = null
  private subscriptions = new Subscription()

  public state: State = {
    connected: false,
    linked: false
  }

  public componentDidMount() {
    const { session } = this
    const walletLinkHost = new WalletLinkHost(session.id, session.key, RPC_URL)
    const web3Handler = new WalletLinkWeb3Handler(
      walletLinkHost,
      session.secret
    )
    this.walletLinkHost = walletLinkHost
    this.web3Handler = web3Handler

    walletLinkHost.connect()
    web3Handler.listen()

    this.subscriptions.add(
      walletLinkHost.connected$.subscribe(v => this.setState({ connected: v }))
    )
    this.subscriptions.add(
      walletLinkHost.linked$.subscribe(v => this.setState({ linked: v }))
    )

    this.subscriptions.add(
      Session.sessionIdChange$.subscribe(change => {
        if (window.parent && change.oldValue && !change.newValue) {
          window.parent.postMessage("WALLETLINK_UNLINKED", "*")
        }
      })
    )
  }

  public componentWillUnmount() {
    this.subscriptions.unsubscribe()

    if (this.walletLinkHost) {
      this.walletLinkHost.destroy()
      this.walletLinkHost = null
    }
    if (this.web3Handler) {
      this.web3Handler.destroy()
      this.web3Handler = null
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

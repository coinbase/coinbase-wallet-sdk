import React, { useEffect } from "react"
import { style } from "typestyle"
import { Session } from "../models/Session"
import { WalletLinkHost } from "../WalletLinkHost/WalletLinkHost"
import { SessionQRCode } from "./SessionQRCode"

const WEB_HOST = "http://localhost:3000"
const RPC_URL = "ws://localhost:8080/rpc"

const session = Session.load() || new Session().save()
const walletLinkHost = new WalletLinkHost(session.id, session.key, RPC_URL)

const styleApp = style({
  textAlign: "center"
})

const App: React.FC = () => {
  useEffect(() => {
    walletLinkHost.connect()
    return () => walletLinkHost.destroy()
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

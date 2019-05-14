import React, { useEffect } from "react"
import { Session } from "../models/Session"
import { WalletLinkHost } from "../WalletLinkHost/WalletLinkHost"
import "./App.css"

const session = new Session()
const host = new WalletLinkHost(
  session.id,
  session.key,
  "ws://localhost:8080/rpc"
)

const App: React.FC = () => {
  useEffect(() => {
    host.connect()
    return () => host.destroy()
  }, [])

  return (
    <div className="App">
      <p>WalletLink</p>
    </div>
  )
}

export default App

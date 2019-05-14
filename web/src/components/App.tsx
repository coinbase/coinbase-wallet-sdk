import React, { useEffect } from "react"
import { WalletLinkHost } from "../WalletLinkHost/WalletLinkHost"
import "./App.css"

const host = new WalletLinkHost("ws://localhost:8080/rpc")

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

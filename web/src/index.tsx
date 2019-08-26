// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import ReactDOM from "react-dom"
import { cssRule } from "typestyle"
import { App } from "./components/App"

cssRule("*", {
  boxSizing: "border-box"
})

cssRule("html", {
  backgroundColor: "white"
})

cssRule("body", {
  fontFamily:
    `-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", ` +
    `"Arial", sans-serif`,
  margin: 0
})

cssRule("code", {
  fontFamily: '"SF Mono", Menlo, Consolas, "Andale Mono", monosapce'
})

ReactDOM.render(<App />, document.getElementById("root"))

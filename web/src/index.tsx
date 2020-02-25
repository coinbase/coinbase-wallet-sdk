// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import ReactDOM from "react-dom"
import { cssRule } from "typestyle"
import { App } from "./components/App"

cssRule("*", {
  boxSizing: "border-box"
})

cssRule("html", {
  backgroundColor: "#f3f3f3"
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

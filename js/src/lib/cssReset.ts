// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import css from "./cssReset-css"

export function injectCssReset(): void {
  const styleEl = document.createElement("style")
  styleEl.type = "text/css"
  styleEl.appendChild(document.createTextNode(css))
  document.documentElement.appendChild(styleEl)
}

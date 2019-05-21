// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import Web3 from "web3"

declare global {
  interface Window {
    Web3: typeof Web3
  }
}

function chromeMain(): void {
  const { WALLETLINK_WEB_URL } = process.env

  const shouldntInject: boolean =
    (WALLETLINK_WEB_URL && location.origin.startsWith(WALLETLINK_WEB_URL)) ||
    (document.documentElement &&
      document.documentElement.hasAttribute("data-no-walletlink"))

  if (shouldntInject) {
    return
  }

  const walletLinkJS: string = require("../build/walletlink.js").default
  const web3JS: string = require("./web3-0.20.7.min.js").default
  const container = document.head || document.documentElement!
  const s = document.createElement("script")
  s.textContent = `
    ${web3JS};\n
    ${walletLinkJS};\n
    window.walletLink = new WalletLink({ appName: "WalletLink App" })
    window.ethereum = walletLink.makeWeb3Provider(
      "https://mainnet.infura.io/v3/38747f203c9e4ffebbdaf0f6c09ad72c",
      1
    )
    window.web3 = new Web3(window.ethereum)
  `
  container.insertBefore(s, container.children[0])
}

chromeMain()

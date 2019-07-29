// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import Web3 from "web3"

declare global {
  interface Window {
    Web3: typeof Web3
  }
}

function chromeMain(): void {
  const WALLETLINK_URL =
    process.env.WALLETLINK_URL! || "https://www.walletlink.org"

  const shouldntInject: boolean =
    (WALLETLINK_URL && document.location.origin.startsWith(WALLETLINK_URL)) ||
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
    // web3.js
    ${web3JS};
    // walletlink.js
    ${walletLinkJS}
    ;(() => {
      const walletLink = new WalletLink({ appName: document.title })
      const ethereum = walletLink.makeWeb3Provider(
        "https://mainnet.infura.io/v3/38747f203c9e4ffebbdaf0f6c09ad72c",
        1
      )
      const web3 = new Web3(ethereum)
      web3.eth.defaultAccount = web3.eth.accounts[0]

      ethereum.on('accountsChanged', accounts => {
        web3.eth.defaultAccount = accounts[0]
      })

      window.walletLink = walletLink
      window.ethereum = ethereum
      window.web3 = web3

      window.addEventListener('load', _ => {
        walletLink.setAppInfo(document.title, null)
      }, false)
    })()
  `
  container.insertBefore(s, container.children[0])
}

chromeMain()

// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

export const links = {
  githubJsRepo: "https://github.com/walletlink/walletlink",
  githubMobileRepo: "https://github.com/walletlink/walletlink-mobile-sdk",
  githubOrg: "https://github.com/walletlink",
  npm: "https://www.npmjs.com/package/walletlink",
  coinbaseWallet: "https://wallet.coinbase.com/"
}

export const dapps: Array<[string, string, string]> = [
  // [name, logoUrl, url]
  [
    "Compound",
    require("../../images/dapps/compound.svg"),
    "https://compound.finance"
  ],
  ["dYdX", require("../../images/dapps/dydx.svg"), "https://dydx.exchange/"],
  ["IDEX", require("../../images/dapps/idex.svg"), "https://idex.market/"],
  [
    "Maker",
    require("../../images/dapps/maker.svg"),
    "https://cdp.makerdao.com"
  ],
  ["Uniswap", require("../../images/dapps/uniswap.svg"), "https://uniswap.io"]
]

export const quotes: Array<[string, string, string, string, string, string]> = [
  // [quote, photoUrl, name, company, personalUrl, companyUrl]
  [
    "WalletLink makes accessing DeFi services secure and simple.",
    require("../../images/people/petejkim.jpg"),
    "Pete Kim",
    "Coinbase",
    "http://twitter.com/petejkim",
    "https://wallet.coinbase.com"
  ]
]

export const snippet = `
<span class="k">import</span> WalletLink <span class="k">from</span> <span class="s">"walletlink"</span>
<span class="k">import</span> Web3 <span class="k">from</span> <span class="s">"web3"</span>

<span class="k">export const</span> WalletLink <span class="k">= new</span> <span class="f">WalletLink</span>({
  appName: <span class="s">"My Awesome DApp"</span>,
  appLogoUrl: <span class="s">"https://example.com/logo.png"</span>
})

<span class="k">export const</span> ethereum <span class="k">=</span> walletLink.<span class="f">makeWeb3Provider</span>(
  <span class="s">"https://mainnet.infura.io/v3/INFURA_API_KEY"</span>, <span class="n">1</span>
)

<span class="k">export const</span> web3 <span class="k">= new</span> <span class="f">Web3</span>(ethereum)
`.trim()

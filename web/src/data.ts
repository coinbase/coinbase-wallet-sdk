// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

export const links = {
  githubJsRepo: "https://github.com/walletlink/walletlink",
  githubMobileRepo: "https://github.com/walletlink/walletlink-mobile-sdk",
  githubOrg: "https://github.com/walletlink",
  npm: "https://www.npmjs.com/package/walletlink",
  coinbaseWallet: "https://wallet.coinbase.com/"
}

export const dapps: [string, string, string][] = [
  // [name, logoUrl, url]
  [
    "Compound",
    require("./images/dapps/compound.svg"),
    "https://compound.finance"
  ],
  ["dYdX", require("./images/dapps/dydx.svg"), "https://dydx.exchange/"],
  ["Maker", require("./images/dapps/maker.svg"), "https://cdp.makerdao.com"],
  ["IDEX", require("./images/dapps/idex.svg"), "https://idex.market/"],
  ["Uniswap", require("./images/dapps/uniswap.svg"), "https://uniswap.io"],
  ["0x", require("./images/dapps/0x.svg"), "https://0x.org/zrx/staking"],
  [
    "PoolTogether",
    require("./images/dapps/pooltogether.svg"),
    "https://www.pooltogether.com/"
  ],
  ["Airswap", require("./images/dapps/airswap.svg"), "https://www.airswap.io/"],
  ["DDEX", require("./images/dapps/ddex.svg"), "https://ddex.io/"],
  ["Nuo", require("./images/dapps/nuo.svg"), "https://www.nuo.network/"],
  ["Kyber", require("./images/dapps/kyber.svg"), "https://kyber.network/"],
  ["1inch", require("./images/dapps/1inch.png"), "https://1inch.exchange/"],
  [
    "Sablier",
    require("./images/dapps/sablier.svg"),
    "https://sablier.finance/"
  ],
  ["Zerion", require("./images/dapps/zerion.svg"), "https://zerion.io/"],
  [
    "DeFi Saver",
    require("./images/dapps/defi-saver.svg"),
    "https://defisaver.com/"
  ],
  [
    "Synthetix",
    require("./images/dapps/synthetix.svg"),
    "https://www.synthetix.io/"
  ],
  [
    "Set Protocol",
    require("./images/dapps/set.svg"),
    "https://www.tokensets.com/"
  ],
  ["Aave", require("./images/dapps/aave.svg"), "https://aave.com/"]
]

export const quotes: [string, string, string, string, string, string][] = [
  // [quote, photoUrl, name, company, personalUrl, companyUrl]
  [
    "It's a no-brainer upgrade for the user experience.",
    require("./images/people/robert.jpg"),
    "Robert Leshner",
    "Compound",
    "https://twitter.com/rleshner",
    "https://compound.finance/"
  ],
  [
    "Integrating WalletLink was super easy, and took us less than a day!",
    require("./images/people/antonio.jpg"),
    "Antonio Juliano",
    "dYdX",
    "https://twitter.com/antoniomjuliano",
    "https://dydx.exchange/"
  ],
  [
    "WalletLink makes accessing DeFi services secure and simple.",
    require("./images/people/petejkim.jpg"),
    "Pete Kim",
    "Coinbase",
    "http://twitter.com/petejkim",
    "https://wallet.coinbase.com/"
  ]
]

export const wallets: [string, string, string, string][] = [
  // [walletName, logoUrl, googlePlayUrl, appStoreUrl]
  [
    "Coinbase Wallet",
    require("./images/wallets/coinbase-wallet.svg"),
    "https://play.google.com/store/apps/details?id=org.toshi",
    "https://itunes.apple.com/app/coinbase-wallet/id1278383455?ls=1&mt=8"
  ]
]

export const snippet = `
<span class="k">import</span> WalletLink <span class="k">from</span> <span class="s">"walletlink"</span>
<span class="k">import</span> Web3 <span class="k">from</span> <span class="s">"web3"</span>

<span class="k">export const</span> walletLink <span class="k">= new</span> <span class="f">WalletLink</span>({
  appName: <span class="s">"My Awesome DApp"</span>,
  appLogoUrl: <span class="s">"https://example.com/logo.png"</span>,
  darkMode: <span class="n">"false</span>
})

<span class="k">export const</span> ethereum <span class="k">=</span> walletLink.<span class="f">makeWeb3Provider</span>(
  <span class="s">"https://mainnet.infura.io/v3/INFURA_API_KEY"</span>, <span class="n">1</span>
)

<span class="k">export const</span> web3 <span class="k">= new</span> <span class="f">Web3</span>(ethereum)
`.trim()

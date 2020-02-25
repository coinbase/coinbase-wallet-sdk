// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import classNames from "classnames"
import React from "react"
import { wallets } from "../../data"
import { styles } from "./styles"

const googlePlaySvg = require("../../images/wallets/google-play.svg")
const appStoreSvg = require("../../images/wallets/app-store.svg")

export const WalletsPage = () => (
  <div className={styles.main}>
    <style>
      @import
      url('https://fonts.googleapis.com/css?family=Overpass|Roboto|Roboto+Mono&display=swap');
    </style>
    <header className={classNames(styles.section._)}>
      <div
        className={classNames(
          styles.section.container._,
          styles.header.content
        )}
      >
        <h1>
          <a href="/">WalletLink</a>
        </h1>
      </div>
    </header>
    <section
      className={classNames(
        styles.section._,
        styles.section.container._,
        styles.box
      )}
    >
      <div className={styles.content}>
        <h3>Supported Wallets</h3>
        <p>
          WalletLink is an open protocol that lets you connect your mobile
          wallet to DApps running on any browser. Download Coinbase Wallet to
          get started. More wallets coming soon.
        </p>

        <ul className={styles.wallets._}>
          {wallets.map(
            ([walletName, logoUrl, googlePlayUrl, appStoreUrl], i) => (
              <li className={styles.wallets.row} key={i}>
                <div className={styles.wallets.logoAndName}>
                  <img src={logoUrl} alt="" />
                  <h4>{walletName}</h4>
                </div>
                <div className={styles.wallets.links}>
                  {googlePlayUrl && (
                    <a href={googlePlayUrl}>
                      <img src={googlePlaySvg} alt="Google Play" />
                    </a>
                  )}
                  {appStoreUrl && (
                    <a href={appStoreUrl}>
                      <img src={appStoreSvg} alt="App Store" />
                    </a>
                  )}
                </div>
              </li>
            )
          )}
        </ul>
        <small>More to come</small>
      </div>
    </section>
  </div>
)

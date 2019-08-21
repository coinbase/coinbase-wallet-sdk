// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import classNames from "classnames"
import React from "react"
import { dapps, links, quotes, snippet } from "./data"
import { images, styles, videos } from "./styles"

export class RootPage extends React.PureComponent {
  public render() {
    return (
      <div className={styles.main}>
        <style>
          @import
          url('https://fonts.googleapis.com/css?family=Overpass|Roboto|Roboto+Mono&display=swap');
        </style>
        <header className={classNames(styles.section._, styles.header._)}>
          <div
            className={classNames(
              styles.section.container._,
              styles.header.content
            )}
          >
            <h1>
              <a href="/">WalletLink</a>
            </h1>
            <a
              className={classNames(
                styles.roundedButton._,
                styles.roundedButton.filled
              )}
              href={links.githubJsRepo}
            >
              Get started
            </a>
          </div>
        </header>
        <section className={styles.section._}>
          <div
            className={classNames(
              styles.section.container._,
              styles.section.container.right
            )}
          >
            <video className={styles.hero.video} autoPlay loop>
              <source src={videos.webm} type="video/webm" />
              <source src={videos.mp4} type="video/mp4" />
            </video>
            <div
              className={classNames(
                styles.section.content._,
                styles.hero.content
              )}
            >
              <h2>Link your DApp to mobile wallets</h2>
              <p>
                WalletLink is an open protocol that lets users connect their
                mobile crypto wallets to your DApp.
              </p>
              <a className={styles.roundedButton._} href={links.githubJsRepo}>
                Get started
              </a>
            </div>
          </div>
        </section>
        <section className={classNames(styles.section._, styles.features._)}>
          <div className={styles.section.container._}>
            <ul>
              <li>
                <img src={images.browser} alt="" />
                <h3>Bring your own browser</h3>
                <p>
                  Users can now use your DApp in any browser without installing
                  an extension
                </p>
              </li>
              <li>
                <img src={images.key} alt="" />
                <h3>Protected private keys</h3>
                <p>
                  Private keys never leave mobile wallets, keeping user funds
                  safe
                </p>
              </li>
              <li>
                <img src={images.lock} alt="" />
                <h3>Encrypted</h3>
                <p>
                  End-to-end encryption using client-side generated keys keeps
                  all user activity private.
                </p>
              </li>
            </ul>
          </div>
          <div className={styles.features.bg} />
        </section>
        <section
          className={classNames(styles.section._, styles.section.alternate)}
        >
          <div
            className={classNames(
              styles.section.container._,
              styles.section.container.right
            )}
          >
            <div
              className={classNames(
                styles.section.content._,
                styles.section.content.half
              )}
            >
              <h2>5 minutes to integrate</h2>
              <p>
                No server deployments, no new library to learn. To integrate
                with WalletLink, all you need to do is drop these few lines to
                initialize a web3 object. WalletLink takes care of the rest.
                WalletLink is open-source and uses minimal dependencies for
                maximum security and no code bloat.
              </p>
              <a
                className={classNames(
                  styles.roundedButton._,
                  styles.roundedButton.secondary
                )}
                href={links.githubJsRepo}
              >
                See WalletLink on GitHub
              </a>
            </div>
            <div className={styles.snippet.box}>
              <div className={styles.snippet.titlebar}>
                <div />
                <div />
                <div />
              </div>
              <pre dangerouslySetInnerHTML={{ __html: snippet }} />
            </div>
          </div>
        </section>
        <section
          className={classNames(styles.section._, styles.section.centered)}
        >
          <div className={styles.section.container._}>
            <div className={styles.section.content._}>
              <h2>Supported DApps on WalletLink</h2>
              <ul className={styles.supportedDAppList}>
                {dapps.map((item, i) => {
                  const [name, logoUrl, url] = item
                  return (
                    <SupportedDApp
                      key={i}
                      name={name}
                      logoUrl={logoUrl}
                      url={url}
                    />
                  )
                })}
              </ul>
            </div>
          </div>
        </section>
        <section
          className={classNames(styles.section._, styles.section.tertiary)}
        >
          <div className={classNames(styles.section.container._)}>
            <ul className={styles.inspiringQuote.list}>
              {quotes.map((item, i) => {
                const [
                  quote,
                  photoUrl,
                  name,
                  company,
                  personalUrl,
                  companyUrl
                ] = item
                return (
                  <InspiringQuote
                    key={i}
                    quote={quote}
                    photoUrl={photoUrl}
                    name={name}
                    company={company}
                    personalUrl={personalUrl}
                    companyUrl={companyUrl}
                    right={i % 2 > 0}
                  />
                )
              })}
            </ul>
          </div>
        </section>
        <section className={styles.section._}>
          <div
            className={classNames(
              styles.section.container._,
              styles.section.container.left
            )}
          >
            <div className={styles.supportedWallets.whiteBg} />
            <div
              className={classNames(
                styles.section.content._,
                styles.section.content.half,
                styles.supportedWallets.content
              )}
            >
              <h2>Supported wallets</h2>
              <p>
                WalletLink is an open protocol aimed at creating a better DApp
                experience for both users and developers. The WalletLink Mobile
                SDK will soon be available for wallet developers to add support
                for the WalletLink protocol to enable users to connect to
                WalletLink-enabled DApps on desktop browsers.
              </p>
              <a
                className={classNames(styles.roundedButton._)}
                href={links.githubMobileRepo}
              >
                See Mobile Wallet SDK on GitHub
              </a>
            </div>
            <div className={styles.supportedWallets.wallets}>
              <div className={styles.supportedWallets.walletLogos}>
                <div
                  className={classNames(
                    styles.supportedWallets.walletLogo._,
                    styles.supportedWallets.coinbaseWallet
                  )}
                />
                <div
                  className={classNames(
                    styles.supportedWallets.walletLogo._,
                    styles.supportedWallets.walletLogo.behind
                  )}
                />
                <div
                  className={classNames(
                    styles.supportedWallets.walletLogo._,
                    styles.supportedWallets.walletLogo.behind2
                  )}
                />
              </div>
              <h4>
                <a href={links.coinbaseWallet}>Coinbase Wallet</a>
              </h4>
              <p>More wallets coming soon</p>
            </div>
          </div>
        </section>
        <section
          className={classNames(styles.section._, styles.section.alternate)}
        >
          <div className={styles.section.container._}>
            <div
              className={classNames(styles.section.content._, styles.lastCTA)}
            >
              <h2>Get started with WalletLink today</h2>
              <a
                className={classNames(
                  styles.roundedButton._,
                  styles.roundedButton.secondary
                )}
                href={links.githubJsRepo}
              >
                Get started
              </a>
            </div>
          </div>
        </section>
        <footer className={classNames(styles.section._, styles.footer._)}>
          <div
            className={classNames(
              styles.section.container._,
              styles.footer.content
            )}
          >
            <ul>
              <li>
                <a href={links.githubOrg}>GitHub</a>
              </li>
              <li>
                <a href={links.npm}>NPM</a>
              </li>
            </ul>
            <h4>
              <a href="/">WalletLink.org</a>
            </h4>
          </div>
        </footer>
      </div>
    )
  }
}

const SupportedDApp = (props: {
  name: string
  logoUrl: string
  url: string
}) => (
  <li className={styles.supportedDApp}>
    <a href={props.url}>
      <div className={styles.supportedDAppLogo}>
        <img src={props.logoUrl} alt="" />
      </div>
      {props.name}
    </a>
  </li>
)

const InspiringQuote = (props: {
  quote: string
  photoUrl: string
  name: string
  company: string
  personalUrl: string
  companyUrl: string
  right?: boolean
}) => (
  <li
    className={classNames(
      styles.inspiringQuote.item._,
      props.right && styles.inspiringQuote.item.right
    )}
  >
    <blockquote>&ldquo;{props.quote}&rdquo;</blockquote>
    <div
      className={classNames(
        styles.inspiringQuote.person._,
        props.right && styles.inspiringQuote.person.right
      )}
    >
      <img src={props.photoUrl} alt="" />
      <div>
        <p>
          <a href={props.personalUrl}>{props.name}</a>
        </p>
        <p>
          <a href={props.companyUrl}>{props.company}</a>
        </p>
      </div>
    </div>
  </li>
)

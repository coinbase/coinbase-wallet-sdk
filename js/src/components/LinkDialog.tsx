// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import clsx from "clsx"
import { FunctionComponent, h } from "preact"
import { useEffect, useState } from "preact/hooks"
import css from "./LinkDialog-css"
import { QRCode } from "./QRCode"
import { Spinner } from "./Spinner"

export const LinkDialog: FunctionComponent<{
  darkMode: boolean
  version: string
  sessionId: string
  sessionSecret: string
  walletLinkUrl: string
  isOpen: boolean
  isConnected: boolean
  onCancel: (() => void) | null
}> = props => {
  const [isContainerHidden, setContainerHidden] = useState(!props.isOpen)
  const [isDialogHidden, setDialogHidden] = useState(!props.isOpen)

  useEffect(() => {
    const { isOpen } = props
    const timers = [
      window.setTimeout(() => {
        setDialogHidden(!isOpen)
      }, 10)
    ]

    if (isOpen) {
      setContainerHidden(false)
    } else {
      timers.push(
        window.setTimeout(() => {
          setContainerHidden(true)
        }, 360)
      )
    }

    return () => {
      timers.forEach(window.clearTimeout)
    }
  }, [props.isOpen])

  return (
    <div
      class={clsx(
        "-walletlink-link-dialog-container",
        props.darkMode && "-walletlink-link-dialog-container-dark",
        isContainerHidden && "-walletlink-link-dialog-container-hidden"
      )}
    >
      <style>{css}</style>
      <div
        class={clsx(
          "-walletlink-link-dialog-backdrop",
          isDialogHidden && "-walletlink-link-dialog-backdrop-hidden"
        )}
      />
      <div class="-walletlink-link-dialog">
        <div
          class={clsx(
            "-walletlink-link-dialog-box",
            isDialogHidden && "-walletlink-link-dialog-box-hidden"
          )}
        >
          <ScanQRCode
            darkMode={props.darkMode}
            version={props.version}
            sessionId={props.sessionId}
            sessionSecret={props.sessionSecret}
            walletLinkUrl={props.walletLinkUrl}
            isConnected={props.isConnected}
          />

          {props.onCancel && <CancelButton onClick={props.onCancel} />}
        </div>
      </div>
    </div>
  )
}

const ScanQRCode: FunctionComponent<{
  darkMode: boolean
  version: string
  sessionId: string
  sessionSecret: string
  walletLinkUrl: string
  isConnected: boolean
}> = props => {
  const serverUrl = window.encodeURIComponent(props.walletLinkUrl)
  const qrUrl = `${props.walletLinkUrl}/#/link?id=${props.sessionId}&secret=${props.sessionSecret}&server=${serverUrl}&v=1`

  return (
    <div class="-walletlink-link-dialog-box-content">
      <h3>
        Scan to
        <br /> Connect
      </h3>

      <div class="-walletlink-link-dialog-box-content-qrcode">
        <div class="-walletlink-link-dialog-box-content-qrcode-wrapper">
          <QRCode
            content={qrUrl}
            width={224}
            height={224}
            fgColor="#000"
            bgColor="transparent"
          />
        </div>
        <input type="hidden" value={qrUrl} />
        {!props.isConnected && (
          <div class="-walletlink-link-dialog-box-content-qrcode-connecting">
            <Spinner size={128} color={props.darkMode ? "#fff" : "#000"} />
            <p>Connecting...</p>
          </div>
        )}
        <p title={`WalletLink v${props.version}`}>Powered by WalletLink</p>
      </div>

      <a
        href={`${props.walletLinkUrl}/#/wallets`}
        target="_blank"
        rel="noopener"
      >
        Don&rsquo;t have a wallet app?
      </a>
    </div>
  )
}

const CancelButton: FunctionComponent<{ onClick: () => void }> = props => (
  <button class="-walletlink-link-dialog-box-cancel" onClick={props.onClick}>
    <div class="-walletlink-link-dialog-box-cancel-x" />
  </button>
)

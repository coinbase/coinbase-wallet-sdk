// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import clsx from "clsx"
import { FunctionComponent, h } from "preact"
import { useEffect, useState } from "preact/hooks"

import { LIB_VERSION } from "../version"
import css from "./LinkDialog-css"
import { QRCode } from "./QRCode"
import { Spinner } from "./Spinner"

export const LinkDialog: FunctionComponent<{
  darkMode: boolean
  version: string
  sessionId: string
  sessionSecret: string
  linkAPIUrl: string
  isOpen: boolean
  isConnected: boolean
  isParentConnection: boolean
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
        "-cbwsdk-link-dialog-container",
        props.darkMode && "-cbwsdk-link-dialog-container-dark",
        isContainerHidden && "-cbwsdk-link-dialog-container-hidden"
      )}
    >
      <style>{css}</style>
      <div
        class={clsx(
          "-cbwsdk-link-dialog-backdrop",
          isDialogHidden && "-cbwsdk-link-dialog-backdrop-hidden"
        )}
      />
      <div class="-cbwsdk-link-dialog">
        <div
          class={clsx(
            "-cbwsdk-link-dialog-box",
            isDialogHidden && "-cbwsdk-link-dialog-box-hidden"
          )}
        >
          <ScanQRCode
            darkMode={props.darkMode}
            version={props.version}
            sessionId={props.sessionId}
            sessionSecret={props.sessionSecret}
            linkAPIUrl={props.linkAPIUrl}
            isConnected={props.isConnected}
            isParentConnection={props.isParentConnection}
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
  linkAPIUrl: string
  isConnected: boolean
  isParentConnection: boolean
}> = props => {
  const serverUrl = window.encodeURIComponent(props.linkAPIUrl)
  const sessionIdKey = props.isParentConnection ? "parent-id" : "id"
  const qrUrl = `${props.linkAPIUrl}/#/link?${sessionIdKey}=${props.sessionId}&secret=${props.sessionSecret}&server=${serverUrl}&v=1`

  return (
    <div class="-cbwsdk-link-dialog-box-content">
      <h3>
        Scan to
        <br /> Connect
      </h3>

      <div class="-cbwsdk-link-dialog-box-content-qrcode">
        <div class="-cbwsdk-link-dialog-box-content-qrcode-wrapper">
          <QRCode
            content={qrUrl}
            width={224}
            height={224}
            fgColor="#000"
            bgColor="transparent"
          />
        </div>
        <input type="hidden" name="cbwsdk-version" value={LIB_VERSION} />
        <input type="hidden" value={qrUrl} />
        {!props.isConnected && (
          <div class="-cbwsdk-link-dialog-box-content-qrcode-connecting">
            <Spinner size={128} color={props.darkMode ? "#fff" : "#000"} />
            <p>Connecting...</p>
          </div>
        )}
        <p title={`Coinbase Wallet SDK v${props.version}`}>
          Powered by Coinbase Wallet SDK
        </p>
      </div>

      <a href={`${props.linkAPIUrl}/#/wallets`} target="_blank" rel="noopener">
        Don&rsquo;t have a wallet app?
      </a>
    </div>
  )
}

const CancelButton: FunctionComponent<{ onClick: () => void }> = props => (
  <button class="-cbwsdk-link-dialog-box-cancel" onClick={props.onClick}>
    <div class="-cbwsdk-link-dialog-box-cancel-x" />
  </button>
)

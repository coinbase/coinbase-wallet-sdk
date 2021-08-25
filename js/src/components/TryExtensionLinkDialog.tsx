import clsx from "clsx"
import css from "./TryExtensionLinkDialog-css"
import linkIcon from "./icons/link-icon-svg"
import globeIcon from "./icons/globe-icon-svg"
import lockIcon from "./icons/lock-icon-svg"
import walletLogo from "./icons/QRLogo"
import { FunctionComponent, h } from "preact"
import { useState, useEffect } from "preact/hooks"
import { QRCode } from "./QRCode"
import { Spinner } from "./Spinner"

export const TryExtensionLinkDialog: FunctionComponent<{
  darkMode: boolean
  version: string
  sessionId: string
  sessionSecret: string
  walletLinkUrl: string
  isOpen: boolean
  isConnected: boolean
  isParentConnection: boolean
  connectDisabled: boolean
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
        "-walletlink-extension-dialog-container",
        isContainerHidden && "-walletlink-extension-dialog-container-hidden"
      )}
    >
      <style>{css}</style>
      <div
        class={clsx(
          "-walletlink-extension-dialog-backdrop",
          isDialogHidden && "-walletlink-extension-dialog-backdrop-hidden"
        )}
      />
      <div class="-walletlink-extension-dialog">
        <div
          class={clsx(
            "-walletlink-extension-dialog-box",
            isDialogHidden && "-walletlink-extension-dialog-box-hidden"
          )}
        >
          <TryExtensionBox
            onInstallClick={() => {
              window.open(
                "https://api.wallet.coinbase.com/rpc/v2/desktop/chrome",
                "_blank"
              )
            }}
          />
          {!props.connectDisabled ? <ScanQRBox
            darkMode={props.darkMode}
            version={props.version}
            sessionId={props.sessionId}
            sessionSecret={props.sessionSecret}
            walletLinkUrl={props.walletLinkUrl}
            isConnected={props.isConnected}
            isParentConnection={props.isParentConnection}
          /> : null}

          {props.onCancel && <CancelButton onClick={props.onCancel} />}
        </div>
      </div>
    </div>
  )
}

const TryExtensionBox: FunctionComponent<{
  onInstallClick: () => void
}> = props => {
  return (
    <div class="-walletlink-extension-dialog-box-top">
      <div class="-walletlink-extension-dialog-box-top-install-region">
        <h2>Try Coinbase Wallet extension</h2>
        <button onClick={props.onInstallClick}>Install</button>
      </div>
      <div class="-walletlink-extension-dialog-box-top-info-region">
        <DescriptionItem
          icon={linkIcon}
          text="Connect to crypto apps with one click"
        />
        <DescriptionItem
          icon={lockIcon}
          text="Private keys remain secure on mobile app"
        />
        <DescriptionItem
          icon={globeIcon}
          text="Compatible with all crypto apps"
        />
      </div>
    </div>
  )
}

const ScanQRBox: FunctionComponent<{
  darkMode: boolean
  version: string
  sessionId: string
  sessionSecret: string
  walletLinkUrl: string
  isConnected: boolean
  isParentConnection: boolean
}> = props => {
  const serverUrl = window.encodeURIComponent(props.walletLinkUrl)
  const sessionIdKey = props.isParentConnection ? "parent-id" : "id"
  const qrUrl = `${props.walletLinkUrl}/#/link?${sessionIdKey}=${props.sessionId}&secret=${props.sessionSecret}&server=${serverUrl}&v=1`

  return (
    <div class="-walletlink-extension-dialog-box-bottom">
      <div class="-walletlink-extension-dialog-box-bottom-description-region">
        <h2>Or scan to connect</h2>
        <body class="-walletlink-extension-dialog-box-bottom-description">
          Open <a href={"https://wallet.coinbase.com/"}>Coinbase Wallet</a> on
          your mobile phone and scan
        </body>
      </div>
      <div class="-walletlink-extension-dialog-box-bottom-qr-region">
        <div class="-walletlink-extension-dialog-box-bottom-qr-wrapper">
          <QRCode
            content={qrUrl}
            width={150}
            height={150}
            fgColor="#000"
            bgColor="transparent"
            image={{
              svg: walletLogo,
              width: 34,
              height: 34
            }}
          />
        </div>
        <input type="hidden" value={qrUrl} />
        {!props.isConnected && (
          <div class="-walletlink-extension-dialog-box-bottom-qr-connecting">
            <Spinner size={36} color={"#000"} />
            <p>Connecting...</p>
          </div>
        )}
      </div>
    </div>
  )
}

const DescriptionItem: FunctionComponent<{
  icon: string
  text: string
}> = props => {
  return (
    <div class="-walletlink-extension-dialog-box-top-description">
      <div class="-walletlink-extension-dialog-box-top-description-icon-wrapper">
        <img src={props.icon} />
      </div>
      <body class="-walletlink-extension-dialog-box-top-description-text">
        {props.text}
      </body>
    </div>
  )
}

const CancelButton: FunctionComponent<{ onClick: () => void }> = props => (
  <button
    class="-walletlink-extension-dialog-box-cancel"
    onClick={props.onClick}
  >
    <div class="-walletlink-extension-dialog-box-cancel-x" />
  </button>
)

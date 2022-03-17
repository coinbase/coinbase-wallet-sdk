import clsx from "clsx"
import { FunctionComponent, h } from "preact"
import { useEffect, useState } from "preact/hooks"

import { LIB_VERSION } from "../version"
import globeIcon from "./icons/globe-icon-svg"
import linkIcon from "./icons/link-icon-svg"
import lockIcon from "./icons/lock-icon-svg"
import walletLogo from "./icons/QRLogo"
import { QRCode } from "./QRCode"
import { Spinner } from "./Spinner"
import css from "./TryExtensionLinkDialog-css"

export const TryExtensionLinkDialog: FunctionComponent<{
  darkMode: boolean
  version: string
  sessionId: string
  sessionSecret: string
  linkAPIUrl: string
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
        "-cbwsdk-extension-dialog-container",
        isContainerHidden && "-cbwsdk-extension-dialog-container-hidden"
      )}
    >
      <style>{css}</style>
      <div
        class={clsx(
          "-cbwsdk-extension-dialog-backdrop",
          isDialogHidden && "-cbwsdk-extension-dialog-backdrop-hidden"
        )}
      />
      <div class="-cbwsdk-extension-dialog">
        <div
          class={clsx(
            "-cbwsdk-extension-dialog-box",
            isDialogHidden && "-cbwsdk-extension-dialog-box-hidden"
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
          {!props.connectDisabled ? (
            <ScanQRBox
              darkMode={props.darkMode}
              version={props.version}
              sessionId={props.sessionId}
              sessionSecret={props.sessionSecret}
              linkAPIUrl={props.linkAPIUrl}
              isConnected={props.isConnected}
              isParentConnection={props.isParentConnection}
            />
          ) : null}

          {props.onCancel && <CancelButton onClick={props.onCancel} />}
        </div>
      </div>
    </div>
  )
}

const TryExtensionBox: FunctionComponent<{
  onInstallClick: () => void
}> = props => {
  const [isClicked, setIsClicked] = useState(false)

  const clickHandler = () => {
    if (isClicked) {
      window.location.reload()
    } else {
      props.onInstallClick()
      setIsClicked(true)
    }
  }

  return (
    <div class="-cbwsdk-extension-dialog-box-top">
      <div class="-cbwsdk-extension-dialog-box-top-install-region">
        <h2>Try the Coinbase Wallet extension</h2>
        {isClicked && (
          <div class="-cbwsdk-extension-dialog-box-top-subtext">
            After installing Coinbase Wallet, refresh the page and connect
            again.
          </div>
        )}
        <button onClick={clickHandler}>
          {isClicked ? "Refresh" : "Install"}
        </button>
      </div>
      <div class="-cbwsdk-extension-dialog-box-top-info-region">
        <DescriptionItem
          icon={linkIcon}
          text="Connect to crypto apps with one click"
        />
        <DescriptionItem
          icon={lockIcon}
          text="Your private key is stored securely"
        />
        <DescriptionItem
          icon={globeIcon}
          text="Works with Ethereum, Polygon, and more"
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
  linkAPIUrl: string
  isConnected: boolean
  isParentConnection: boolean
}> = props => {
  const serverUrl = window.encodeURIComponent(props.linkAPIUrl)
  const sessionIdKey = props.isParentConnection ? "parent-id" : "id"
  const qrUrl = `${props.linkAPIUrl}/#/link?${sessionIdKey}=${props.sessionId}&secret=${props.sessionSecret}&server=${serverUrl}&v=1`

  return (
    <div class="-cbwsdk-extension-dialog-box-bottom">
      <div class="-cbwsdk-extension-dialog-box-bottom-description-region">
        <h2>Or scan to connect</h2>
        <body class="-cbwsdk-extension-dialog-box-bottom-description">
          Open{" "}
          <a
            href={"https://wallet.coinbase.com/"}
            target="_blank"
            rel="noopener noreferrer"
          >
            Coinbase Wallet
          </a>{" "}
          on your mobile phone and scan
        </body>
      </div>
      <div class="-cbwsdk-extension-dialog-box-bottom-qr-region">
        <div class="-cbwsdk-extension-dialog-box-bottom-qr-wrapper">
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
        <input type="hidden" name="cbwsdk-version" value={LIB_VERSION} />
        <input type="hidden" value={qrUrl} />
        {!props.isConnected && (
          <div class="-cbwsdk-extension-dialog-box-bottom-qr-connecting">
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
    <div class="-cbwsdk-extension-dialog-box-top-description">
      <div class="-cbwsdk-extension-dialog-box-top-description-icon-wrapper">
        <img src={props.icon} />
      </div>
      <body class="-cbwsdk-extension-dialog-box-top-description-text">
        {props.text}
      </body>
    </div>
  )
}

const CancelButton: FunctionComponent<{ onClick: () => void }> = props => (
  <button class="-cbwsdk-extension-dialog-box-cancel" onClick={props.onClick}>
    <div class="-cbwsdk-extension-dialog-box-cancel-x" />
  </button>
)

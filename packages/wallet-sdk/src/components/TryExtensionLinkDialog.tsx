import clsx from "clsx";
import { FunctionComponent, h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";

import { createQrUrl } from "../util";
import { LIB_VERSION } from "../version";
import globeIcon from "./icons/globe-icon-svg";
import linkIcon from "./icons/link-icon-svg";
import lockIcon from "./icons/lock-icon-svg";
import walletLogo from "./icons/QRLogo";
import { QRCode } from "./QRCode";
import { Spinner } from "./Spinner";
import css from "./TryExtensionLinkDialog-css";

export const TryExtensionLinkDialog: FunctionComponent<{
  darkMode: boolean;
  version: string;
  sessionId: string;
  sessionSecret: string;
  linkAPIUrl: string;
  isOpen: boolean;
  isConnected: boolean;
  isParentConnection: boolean;
  chainId: number;
  connectDisabled: boolean;
  onCancel: (() => void) | null;
}> = props => {
  const { isOpen, darkMode } = props;
  const [isContainerHidden, setContainerHidden] = useState(!isOpen);
  const [isDialogHidden, setDialogHidden] = useState(!isOpen);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        setDialogHidden(!isOpen);
      }, 10),
    ];

    if (isOpen) {
      setContainerHidden(false);
    } else {
      timers.push(
        window.setTimeout(() => {
          setContainerHidden(true);
        }, 360),
      );
    }

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [props.isOpen]);

  const theme = darkMode ? "dark" : "light";

  return (
    <div
      class={clsx(
        "-cbwsdk-extension-dialog-container",
        isContainerHidden && "-cbwsdk-extension-dialog-container-hidden",
      )}
    >
      <style>{css}</style>
      <div
        class={clsx(
          "-cbwsdk-extension-dialog-backdrop",
          theme,
          isDialogHidden && "-cbwsdk-extension-dialog-backdrop-hidden",
        )}
      />
      <div class="-cbwsdk-extension-dialog">
        <div
          class={clsx(
            "-cbwsdk-extension-dialog-box",
            isDialogHidden && "-cbwsdk-extension-dialog-box-hidden",
          )}
        >
          <TryExtensionBox
            darkMode={darkMode}
            onInstallClick={() => {
              window.open(
                "https://api.wallet.coinbase.com/rpc/v2/desktop/chrome",
                "_blank",
              );
            }}
          />
          {!props.connectDisabled ? (
            <ScanQRBox
              darkMode={darkMode}
              version={props.version}
              sessionId={props.sessionId}
              sessionSecret={props.sessionSecret}
              linkAPIUrl={props.linkAPIUrl}
              isConnected={props.isConnected}
              isParentConnection={props.isParentConnection}
              chainId={props.chainId}
            />
          ) : null}

          {props.onCancel && (
            <CancelButton darkMode={darkMode} onClick={props.onCancel} />
          )}
        </div>
      </div>
    </div>
  );
};

const TryExtensionBox: FunctionComponent<{
  darkMode: boolean;
  onInstallClick: () => void;
}> = ({ darkMode, onInstallClick }) => {
  const [isClicked, setIsClicked] = useState(false);

  const clickHandler = useCallback(() => {
    if (isClicked) {
      window.location.reload();
    } else {
      onInstallClick();
      setIsClicked(true);
    }
  }, [onInstallClick, isClicked]);

  const theme = darkMode ? "dark" : "light";

  return (
    <div class={clsx("-cbwsdk-extension-dialog-box-top", theme)}>
      <div class={"-cbwsdk-extension-dialog-box-top-install-region"}>
        <h2 class={theme}>Try the Coinbase Wallet extension</h2>
        {isClicked && (
          <div class={"-cbwsdk-extension-dialog-box-top-subtext"}>
            After installing Coinbase Wallet, refresh the page and connect
            again.
          </div>
        )}
        <button type="button" onClick={clickHandler}>
          {isClicked ? "Refresh" : "Install"}
        </button>
      </div>
      <div class={clsx("-cbwsdk-extension-dialog-box-top-info-region", theme)}>
        <DescriptionItem
          darkMode={darkMode}
          icon={linkIcon}
          text="Connect to crypto apps with one click"
        />
        <DescriptionItem
          darkMode={darkMode}
          icon={lockIcon}
          text="Your private key is stored securely"
        />
        <DescriptionItem
          darkMode={darkMode}
          icon={globeIcon}
          text="Works with Ethereum, Polygon, and more"
        />
      </div>
    </div>
  );
};

const ScanQRBox: FunctionComponent<{
  darkMode: boolean;
  version: string;
  sessionId: string;
  sessionSecret: string;
  linkAPIUrl: string;
  isConnected: boolean;
  isParentConnection: boolean;
  chainId: number;
}> = props => {
  const qrUrl = createQrUrl(
    props.sessionId,
    props.sessionSecret,
    props.linkAPIUrl,
    props.isParentConnection,
    props.version,
    props.chainId,
  );

  const theme = props.darkMode ? "dark" : "light";

  return (
    <div
      data-testid="scan-qr-box"
      class={clsx(`-cbwsdk-extension-dialog-box-bottom`, theme)}
    >
      <div class={`-cbwsdk-extension-dialog-box-bottom-description-region`}>
        <h2 class={theme}>Or scan to connect</h2>
        <body
          class={clsx(`-cbwsdk-extension-dialog-box-bottom-description`, theme)}
        >
          Open{" "}
          <a
            href="https://wallet.coinbase.com/"
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
              height: 34,
            }}
          />
        </div>
        <input type="hidden" name="cbwsdk-version" value={LIB_VERSION} />
        <input type="hidden" value={qrUrl} />
        {!props.isConnected && (
          <div
            data-testid="connecting-spinner"
            class={clsx(
              "-cbwsdk-extension-dialog-box-bottom-qr-connecting",
              theme,
            )}
          >
            <Spinner size={36} color={props.darkMode ? "#FFF" : "#000"} />
            <p>Connecting...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DescriptionItem: FunctionComponent<{
  icon: string;
  text: string;
  darkMode: boolean;
}> = props => {
  const theme = props.darkMode ? "dark" : "light";
  return (
    <div class="-cbwsdk-extension-dialog-box-top-description">
      <div class="-cbwsdk-extension-dialog-box-top-description-icon-wrapper">
        <img src={props.icon} />
      </div>
      <body
        class={clsx("-cbwsdk-extension-dialog-box-top-description-text", theme)}
      >
        {props.text}
      </body>
    </div>
  );
};

const CancelButton: FunctionComponent<{
  onClick: () => void;
  darkMode: boolean;
}> = props => {
  const theme = props.darkMode ? "dark" : "light";
  return (
    <button
      type="button"
      class={clsx("-cbwsdk-extension-dialog-box-cancel", theme)}
      onClick={props.onClick}
    >
      <div class={clsx("-cbwsdk-extension-dialog-box-cancel-x", theme)} />
    </button>
  );
};

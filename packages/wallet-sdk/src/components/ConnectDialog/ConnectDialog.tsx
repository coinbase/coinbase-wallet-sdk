import clsx from "clsx";
import { useCallback, useState } from "preact/hooks";

import { createQrUrl } from "../../util";
import closeIcon from "../icons/close-icon-svg";
import coinbaseRound from "../icons/coinbase-round-svg";
import coinbaseWalletRound from "../icons/coinbase-wallet-round-svg";
import moreIcon from "../icons/more-icon-svg";
import coinbaseLogo from "../icons/QRLogoCoinbase";
import walletLogo from "../icons/QRLogoWallet";
import scanIcon from "../icons/scan-icon-svg";
import { QRCode } from "../QRCode";
import css from "./ConnectDialog-css";
import { ConnectItem } from "./ConnectItem";
import { Theme } from "./types";

type ConnectDialogProps = {
  theme: Theme;
  version: string;
  sessionId: string;
  sessionSecret: string;
  linkAPIUrl: string;
  isConnected: boolean;
  isParentConnection: boolean;
  chainId: number;
  onCancel: (() => void) | null;
};

const wallets = {
  "coinbase-wallet-app": {
    title: "Coinbase Wallet app",
    description: "Connect with your self-custody wallet",
    icon: coinbaseWalletRound,
    steps: CoinbaseWalletSteps,
  },
  "coinbase-app": {
    title: "Coinbase app",
    description: "Connect with your Coinbase account",
    icon: coinbaseRound,
    steps: CoinbaseAppSteps,
  },
};

type WalletType = keyof typeof wallets;

const makeQrCodeImage = (app: string) => {
  switch (app) {
    case "coinbase-app":
      return coinbaseLogo;
    case "coinbase-wallet-app":
    default:
      return walletLogo;
  }
};

export function ConnectDialog(props: ConnectDialogProps) {
  const { theme } = props;
  const [selected, setSelected] = useState<WalletType>("coinbase-wallet-app");

  const handleSelect = useCallback((id: WalletType) => {
    setSelected(id);
  }, []);

  const qrUrl = createQrUrl(
    props.sessionId,
    props.sessionSecret,
    props.linkAPIUrl,
    false,
    props.version,
    1,
  );

    const wallet = wallets[selected];
    if (!selected) {
      return null;
    }
    const WalletSteps = wallet.steps;

  return (
    <>
      <style>{css}</style>
      <div class={clsx("sdk-connect-dialog")}>
        <div class={clsx("sdk-connect-dialog-container", theme)}>
          <div class="sdk-connect-dialog-header">
            <h2 class={clsx("sdk-connect-dialog-heading", theme)}>
              Scan to connect with one of our mobile apps
            </h2>
            {props.onCancel && (
              <button
                type="button"
                className={"sdk-cancel-button"}
                onClick={props.onCancel}
              >
                <img
                  className={clsx("sdk-cancel-button-x", theme)}
                  src={closeIcon}
                  alt=""
                />
              </button>
            )}
          </div>
          <div class="sdk-connect-dialog-layout">
            <div class="sdk-connect-dialog-column-left">
              {Object.entries(wallets).map(([key, value]) => {
                return (
                  <ConnectItem
                    key={key}
                    title={value.title}
                    description={value.description}
                    icon={value.icon}
                    selected={selected === key}
                    onClick={() => handleSelect(key as WalletType)}
                    theme={theme}
                  />
                );
              })}
            </div>
            <div class="sdk-connect-dialog-column-right">
              <QRCode
                content={qrUrl}
                width={212}
                height={212}
                fgColor="#000"
                bgColor="transparent"
                image={{
                  svg: makeQrCodeImage(selected),
                  width: 34,
                  height: 34,
                }}
              />
              <WalletSteps />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function CoinbaseWalletSteps() {
  return (
    <ol class="sdk-wallet-steps">
      <li class="sdk-wallet-steps-item">
        <div class="sdk-wallet-steps-item-container">
          Open Coinbase Wallet app
        </div>
      </li>
      <li class="sdk-wallet-steps-item">
        <div class="sdk-wallet-steps-item-container">
          <span>
            Tap <strong>Scan</strong>{" "}
          </span>
          <img
            class="sdk-wallet-steps-pad-left"
            src={scanIcon}
            alt="scan-icon"
          />
        </div>
      </li>
    </ol>
  );
}

export function CoinbaseAppSteps() {
  return (
    <ol class="sdk-wallet-steps">
      <li class="sdk-wallet-steps-item">
        <div class="sdk-wallet-steps-item-container">Open Coinbase app</div>
      </li>
      <li class="sdk-wallet-steps-item">
        <div class="sdk-wallet-steps-item-container">
          <span>
            Tap <strong>More</strong>
          </span>
          <img
            class="sdk-wallet-steps-pad-left"
            src={moreIcon}
            alt="more-icon"
          />
          <span class="sdk-wallet-steps-pad-left">
            then <strong>Scan</strong>
          </span>
          <img
            class="sdk-wallet-steps-pad-left"
            src={scanIcon}
            alt="scan-icon"
          />
        </div>
      </li>
    </ol>
  );
}

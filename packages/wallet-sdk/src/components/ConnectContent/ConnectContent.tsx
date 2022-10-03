// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import clsx from "clsx";
import { useCallback, useState } from "preact/hooks";

import { createQrUrl } from "../../util";
import { LIB_VERSION } from "../../version";
import closeIcon from "../icons/close-icon-svg";
import coinbaseRound from "../icons/coinbase-round-svg";
import coinbaseWalletRound from "../icons/coinbase-wallet-round-svg";
import moreIcon from "../icons/more-icon-svg";
import coinbaseLogo from "../icons/QRLogoCoinbase";
import walletLogo from "../icons/QRLogoWallet";
import scanIcon from "../icons/scan-icon-svg";
import { QRCode } from "../QRCode";
import { Spinner } from "../Spinner";
import { Theme } from "../types";
import css from "./ConnectContent-css";

type ConnectContentProps = {
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

export function ConnectContent(props: ConnectContentProps) {
  const { theme } = props;
  const [selected, setSelected] = useState<WalletType>("coinbase-wallet-app");

  const handleSelect = useCallback((id: WalletType) => {
    setSelected(id);
  }, []);

  const qrUrl = createQrUrl(
    props.sessionId,
    props.sessionSecret,
    props.linkAPIUrl,
    props.isParentConnection,
    props.version,
    props.chainId,
  );

  const wallet = wallets[selected];
  if (!selected) {
    return null;
  }
  const WalletSteps = wallet.steps;

  return (
    <>
      <style>{css}</style>
      <div class={clsx("-cbwsdk-connect-content", theme)}>
        <div class="-cbwsdk-connect-content-header">
          <h2 class={clsx("-cbwsdk-connect-content-heading", theme)}>
            Scan to connect with one of our mobile apps
          </h2>
          {props.onCancel && (
            <button
              type="button"
              class={"-cbwsdk-cancel-button"}
              onClick={props.onCancel}
            >
              <img
                class={clsx("-cbwsdk-cancel-button-x", theme)}
                src={closeIcon}
                alt=""
              />
            </button>
          )}
        </div>
        <div class="-cbwsdk-connect-content-layout">
          <div class="-cbwsdk-connect-content-column-left">
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
          <div class="-cbwsdk-connect-content-column-right">
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
            <input
              type="hidden"
              name="cbw-cbwsdk-version"
              value={LIB_VERSION}
            />
            <input type="hidden" value={qrUrl} />
            {!props.isConnected && (
              <div
                data-testid="connecting-spinner"
                class={clsx("-cbwsdk-connect-content-qr-connecting", theme)}
              >
                <Spinner size={36} color={theme === "dark" ? "#FFF" : "#000"} />
                <p>Connecting...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

type ConnectItemProps = {
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onClick(): void;
  theme: Theme;
};

export function ConnectItem({
  title,
  description,
  icon,
  selected,
  theme,
  onClick,
}: ConnectItemProps) {
  return (
    <div
      onClick={onClick}
      class={clsx("-cbwsdk-connect-item", theme, { selected })}
    >
      <div>
        <img src={icon} alt={title} />
      </div>
      <div class="-cbwsdk-connect-item-copy-wrapper">
        <h3 class="-cbwsdk-connect-item-title">{title}</h3>
        <p class="-cbwsdk-connect-item-description">{description}</p>
      </div>
    </div>
  );
}

export function CoinbaseWalletSteps() {
  return (
    <ol class="-cbwsdk-wallet-steps">
      <li class="-cbwsdk-wallet-steps-item">
        <div class="-cbwsdk-wallet-steps-item-wrapper">
          Open Coinbase Wallet app
        </div>
      </li>
      <li class="-cbwsdk-wallet-steps-item">
        <div class="-cbwsdk-wallet-steps-item-wrapper">
          <span>
            Tap <strong>Scan</strong>{" "}
          </span>
          <img
            class="-cbwsdk-wallet-steps-pad-left"
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
    <ol class="-cbwsdk-wallet-steps">
      <li class="-cbwsdk-wallet-steps-item">
        <div class="-cbwsdk-wallet-steps-item-wrapper">Open Coinbase app</div>
      </li>
      <li class="-cbwsdk-wallet-steps-item">
        <div class="-cbwsdk-wallet-steps-item-wrapper">
          <span>
            Tap <strong>More</strong>
          </span>
          <img
            class="-cbwsdk-wallet-steps-pad-left"
            src={moreIcon}
            alt="more-icon"
          />
          <span class="-cbwsdk-wallet-steps-pad-left">
            then <strong>Scan</strong>
          </span>
          <img
            class="-cbwsdk-wallet-steps-pad-left"
            src={scanIcon}
            alt="scan-icon"
          />
        </div>
      </li>
    </ol>
  );
}
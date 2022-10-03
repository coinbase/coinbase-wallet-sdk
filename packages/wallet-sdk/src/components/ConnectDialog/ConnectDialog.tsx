import clsx from "clsx";
import { useCallback, useState } from "preact/hooks";
import qs from "qs";

import coinbaseRound from "../icons/coinbase-round-svg";
import coinbaseWalletRound from "../icons/coinbase-wallet-round-svg";
import coinbaseLogo from "../icons/QRLogoCoinbase";
import walletLogo from "../icons/QRLogoWallet";
import { QRCode } from "../QRCode";
import { CancelButton } from "./CancelButton";
import css from "./ConnectDialog-css";
import { ConnectItem } from "./ConnectItem";
import { TryExtensionContent } from "./TryExtensionContent";
import { Theme } from "./types";

type ConnectDialogProps = { darkMode: boolean };

const wallets = [
  {
    id: "coinbase-wallet-app",
    title: "Coinbase Wallet app",
    description: "Connect with your self-custody wallet",
    icon: coinbaseWalletRound,
  },
  {
    id: "coinbase-app",
    title: "Coinbase app",
    description: "Connect with your Coinbase account",
    icon: coinbaseRound,
  },
];

export function createQrUrl(
  sessionId: string,
  sessionSecret: string,
  serverUrl: string,
  isParentConnection: boolean,
  version: string,
  chainId: number
): string {
  const sessionIdKey = isParentConnection ? "parent-id" : "id";

  const query: string = qs.stringify({
    [sessionIdKey]: sessionId,
    secret: sessionSecret,
    server: serverUrl,
    v: version,
    chainId,
  });

  const qrUrl = `${serverUrl}/#/link?${query}`;

  return qrUrl;
}

const makeQrCodeImage = (app: string) => {
  switch (app) {
    case "coinbase-app":
      return coinbaseLogo;
    case "coinbase-wallet-app":
    default:
      return walletLogo;
  }
};

export function ConnectDialog({ darkMode }: ConnectDialogProps) {
  const theme: Theme = darkMode ? "dark" : "light";
  const [selected, setSelected] = useState("coinbase-wallet-app");

  const handleSelect = useCallback((id: string) => {
    setSelected(id);
  }, []);

  const qrUrl = createQrUrl(
    "props.sessionId",
    "props.sessionSecret",
    "props.linkAPIUrl",
    false,
    "props.version",
    1
  );

  return (
    <>
      <style>
        {css}
      </style>
      <div className={clsx("connect-dialog")}>
        <div className={clsx("connect-dialog-container", theme)}>
          <div className="connect-dialog-header">
            <h2 className={clsx("connect-dialog-heading", theme)}>
              Scan to connect with one of our mobile apps
            </h2>
            <CancelButton theme={theme} onClick={() => {}} />
          </div>
          <div className="connect-dialog-layout">
            <div className="connect-dialog-column-left">
              {wallets.map(wallet => {
                return (
                  <ConnectItem
                    key={wallet.id}
                    title={wallet.title}
                    description={wallet.description}
                    icon={wallet.icon}
                    selected={selected === wallet.id}
                    onClick={() => handleSelect(wallet.id)}
                    theme={theme}
                  />
                );
              })}
            </div>
            <div className="connect-dialog-column-right">
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
            </div>
          </div>
        </div>
        <TryExtensionContent theme={theme} />
      </div>
    </>
  );
}

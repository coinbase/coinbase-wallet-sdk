// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import clsx from 'clsx';
import { h } from 'preact';

import { createQrUrl } from '../../../../../core/util';
import { LIB_VERSION } from '../../../../../version';
import { CloseIcon } from '../icons/CloseIcon';
import { CoinbaseWalletRound } from '../icons/CoinbaseWalletRound';
import { QRCodeIcon } from '../icons/QRCodeIcon';
import { QRCode } from '../QRCode';
import { Spinner } from '../Spinner/Spinner';
import { Theme } from '../types';
import css from './ConnectContent-css';

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

const wallet = {
  title: 'Coinbase Wallet app',
  description: 'Connect with your self-custody wallet',
  steps: CoinbaseWalletSteps,
};

const makeIconColor = (theme: Theme) => {
  return theme === 'light' ? '#FFFFFF' : '#0A0B0D';
};

export function ConnectContent(props: ConnectContentProps) {
  const { theme } = props;

  const qrUrl = createQrUrl(
    props.sessionId,
    props.sessionSecret,
    props.linkAPIUrl,
    props.isParentConnection,
    props.version,
    props.chainId
  );

  const WalletSteps = wallet.steps;

  return (
    <div data-testid="connect-content" className={clsx('-cbwsdk-connect-content', theme)}>
      <style>{css}</style>
      <div className="-cbwsdk-connect-content-header">
        <h2 className={clsx('-cbwsdk-connect-content-heading', theme)}>
          Scan to connect with our mobile app
        </h2>
        {props.onCancel && (
          <button type="button" className={'-cbwsdk-cancel-button'} onClick={props.onCancel}>
            <CloseIcon fill={theme === 'light' ? '#0A0B0D' : '#FFFFFF'} />
          </button>
        )}
      </div>
      <div className="-cbwsdk-connect-content-layout">
        <div className="-cbwsdk-connect-content-column-left">
          <ConnectItem title={wallet.title} description={wallet.description} theme={theme} />
        </div>
        <div className="-cbwsdk-connect-content-column-right">
          <div className="-cbwsdk-connect-content-qr-wrapper">
            <QRCode content={qrUrl} width={200} height={200} fgColor="#000" bgColor="transparent" />
            <input type="hidden" name="cbw-cbwsdk-version" value={LIB_VERSION} />
            <input type="hidden" value={qrUrl} />
          </div>
          <WalletSteps theme={theme} />
          {!props.isConnected && (
            <div
              data-testid="connecting-spinner"
              className={clsx('-cbwsdk-connect-content-qr-connecting', theme)}
            >
              <Spinner size={36} color={theme === 'dark' ? '#FFF' : '#000'} />
              <p>Connecting...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ConnectItemProps = {
  title: string;
  description: string;
  theme: Theme;
};

function ConnectItem({ title, description, theme }: ConnectItemProps) {
  return (
    <div className={clsx('-cbwsdk-connect-item', theme)}>
      <div>
        <CoinbaseWalletRound />
      </div>
      <div className="-cbwsdk-connect-item-copy-wrapper">
        <h3 className="-cbwsdk-connect-item-title">{title}</h3>
        <p className="-cbwsdk-connect-item-description">{description}</p>
      </div>
    </div>
  );
}

type WalletStepsProps = {
  theme: Theme;
};

export function CoinbaseWalletSteps({ theme }: WalletStepsProps) {
  return (
    <ol className="-cbwsdk-wallet-steps">
      <li className={clsx('-cbwsdk-wallet-steps-item', theme)}>
        <div className="-cbwsdk-wallet-steps-item-wrapper">Open Coinbase Wallet app</div>
      </li>
      <li className={clsx('-cbwsdk-wallet-steps-item', theme)}>
        <div className="-cbwsdk-wallet-steps-item-wrapper">
          <span>
            Tap <strong>Scan</strong>{' '}
          </span>
          <span
            className={clsx('-cbwsdk-wallet-steps-pad-left', '-cbwsdk-wallet-steps-icon', theme)}
          >
            <QRCodeIcon fill={makeIconColor(theme)} />
          </span>
        </div>
      </li>
    </ol>
  );
}

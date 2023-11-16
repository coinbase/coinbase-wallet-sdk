// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import clsx from 'clsx';
import { h } from 'preact';
import { useCallback, useState } from 'preact/hooks';

import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { LaptopIcon } from '../icons/LaptopIcon';
import { SafeIcon } from '../icons/SafeIcon';
import { Theme } from '../types';
import css from './TryExtensionContent-css';

type TryExtensionContentProps = {
  theme: Theme;
};

export function TryExtensionContent({ theme }: TryExtensionContentProps) {
  const [clicked, setClicked] = useState(false);

  const handleInstallClick = useCallback(() => {
    window.open('https://api.wallet.coinbase.com/rpc/v2/desktop/chrome', '_blank');
  }, []);

  const handleClick = useCallback(() => {
    if (clicked) {
      window.location.reload();
    } else {
      handleInstallClick();
      setClicked(true);
    }
  }, [handleInstallClick, clicked]);

  return (
    <div class={clsx('-cbwsdk-try-extension', theme)}>
      <style>{css}</style>
      <div class="-cbwsdk-try-extension-column-half">
        <h3 class={clsx('-cbwsdk-try-extension-heading', theme)}>
          Or try the Coinbase Wallet browser extension
        </h3>
        <div class="-cbwsdk-try-extension-cta-wrapper">
          <button class={clsx('-cbwsdk-try-extension-cta', theme)} onClick={handleClick}>
            {clicked ? 'Refresh' : 'Install'}
          </button>
          <div>
            {!clicked && (
              <ArrowLeftIcon
                class="-cbwsdk-try-extension-cta-icon"
                fill={theme === 'light' ? '#0052FF' : '#588AF5'}
              />
            )}
          </div>
        </div>
      </div>
      <div class="-cbwsdk-try-extension-column-half">
        <ul class="-cbwsdk-try-extension-list">
          <li class="-cbwsdk-try-extension-list-item">
            <div class="-cbwsdk-try-extension-list-item-icon-wrapper">
              <span class={clsx('-cbwsdk-try-extension-list-item-icon', theme)}>
                <LaptopIcon fill={theme === 'light' ? '#0A0B0D' : '#FFFFFF'} />
              </span>
            </div>
            <div class={clsx('-cbwsdk-try-extension-list-item-copy', theme)}>
              Connect with dapps with just one click on your desktop browser
            </div>
          </li>
          <li class="-cbwsdk-try-extension-list-item">
            <div class="-cbwsdk-try-extension-list-item-icon-wrapper">
              <span class={clsx('-cbwsdk-try-extension-list-item-icon', theme)}>
                <SafeIcon fill={theme === 'light' ? '#0A0B0D' : '#FFFFFF'} />
              </span>
            </div>
            <div class={clsx('-cbwsdk-try-extension-list-item-copy', theme)}>
              Add an additional layer of security by using a supported Ledger hardware wallet
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

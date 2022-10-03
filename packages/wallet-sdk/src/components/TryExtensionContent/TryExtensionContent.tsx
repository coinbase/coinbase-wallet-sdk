// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import clsx from "clsx";
import { useCallback, useState } from "preact/hooks";

import arrowLeftIcon from "../icons/arrow-left-svg";
import laptopIcon from "../icons/laptop-icon-svg";
import safeIcon from "../icons/safe-icon-svg";
import { Theme } from "../types";
import css from "./TryExtensionContent-css";

type TryExtensionContentProps = {
  theme: Theme;
};

export function TryExtensionContent({ theme }: TryExtensionContentProps) {
  const [clicked, setClicked] = useState(false);

  const handleInstallClick = useCallback(() => {
    window.open(
      "https://api.wallet.coinbase.com/rpc/v2/desktop/chrome",
      "_blank",
    );
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
    <>
      <style>{css}</style>
      <div class={clsx("-cbwsdk-try-extension", theme)}>
        <div class="-cbwsdk-try-extension-column-half">
          <h3 class="-cbwsdk-try-extension-heading">
            Or try the Coinbase Wallet browser extension
          </h3>
          <div class="-cbwsdk-try-extension-cta-container">
            <button class="-cbwsdk-try-extension-cta" onClick={handleClick}>
              {clicked ? "Refresh" : "Install"}
            </button>
            <div>
              {!clicked && (
                <img
                  class="-cbwsdk-try-extension-cta-icon"
                  src={arrowLeftIcon}
                  alt="arrow-left-icon"
                />
              )}
            </div>
          </div>
        </div>
        <div class="-cbwsdk-try-extension-column-half">
          <ul class="-cbwsdk-try-extension-list">
            <li class="-cbwsdk-try-extension-list-item">
              <div>
                <img
                  class="-cbwsdk-try-extension-list-item-icon"
                  src={laptopIcon}
                  alt="laptop-icon"
                />
              </div>
              <div>
                Connect with dapps with just one click on your desktop browser
              </div>
            </li>
            <li class="-cbwsdk-try-extension-list-item">
              <div>
                <img
                  class="-cbwsdk-try-extension-list-item-icon"
                  src={safeIcon}
                  alt="safe-icon"
                />
              </div>
              <div>
                Add an additional layer of security by using a supported Ledger
                hardware wallet
              </div>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

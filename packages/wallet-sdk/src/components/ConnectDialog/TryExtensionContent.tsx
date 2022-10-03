import clsx from "clsx";
import { useCallback, useState } from "preact/hooks";

import arrowLeft from "../icons/arrow-left-svg";
import css from "./TryExtensionContent-css";
import { Theme } from "./types";

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
      <style>
        {css}
      </style>
      <div className={clsx("try-extension", theme)}>
        <div className="try-extension-column-half">
          <h3 className="try-extension-heading">
            Or try the Coinbase Wallet browser extension
          </h3>
          <div className="try-extension-cta-container">
            <button className="try-extension-cta" onClick={handleClick}>
              {clicked ? "Refresh" : "Install"}
            </button>
            <div>
              {!clicked && (
                <img
                  className="try-extension-cta-icon"
                  src={arrowLeft}
                  alt="arrow-left-icon"
                />
              )}
            </div>
          </div>
        </div>
        <div className="try-extension-column-half">
          <ul className="try-extension-list">
            <li className="try-extension-list-item">
              Connect with dapps with just one click on your desktop browser
            </li>
            <li className="try-extension-list-item">
              Add an additional layer of security by using a supported Ledger
              hardware wallet
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

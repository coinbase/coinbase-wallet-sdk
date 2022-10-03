import clsx from "clsx";

import css from "./CancelButton-css";
import { Theme } from "./types";

type CancelButtonProps = {
  onClick: () => void;
  theme: Theme;
};

export function CancelButton({ theme, onClick }: CancelButtonProps) {
  return (
    <>
      <style>{css}</style>
      <button
        type="button"
        className={clsx("cbwsdk-cancel-button", theme)}
        onClick={onClick}
      >
        <div className={clsx("cbwsdk-cancel-button-x", theme)} />
      </button>
    </>
  );
};

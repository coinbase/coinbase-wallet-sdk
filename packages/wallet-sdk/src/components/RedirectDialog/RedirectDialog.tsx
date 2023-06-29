import clsx from "clsx";
import { FunctionComponent, h, render } from "preact";

import { injectCssReset } from "../../lib/cssReset";
import { SnackbarContainer } from "../Snackbar";
import css from "./RedirectDialog-css";

export class RedirectDialog {
  private root: Element | null = null;

  public attach(): void {
    const el = document.documentElement;
    this.root = document.createElement("div");
    this.root.className = "-cbwsdk-css-reset";
    el.appendChild(this.root);

    injectCssReset();
  }

  public present(onClick: () => void): void {
    this.render(onClick);
  }

  public clear(): void {
    this.render(null);
  }

  private render(onClick: (() => void) | null): void {
    if (!this.root) return;
    render(null, this.root);

    if (!onClick) return;
    render(
      <RedirectDialogContainer>
        <RedirectDialogContent
          onClick={onClick}
          onDismiss={() => {
            this.clear();
          }}
        />
      </RedirectDialogContainer>,
      this.root,
    );
  }
}

const RedirectDialogContainer: FunctionComponent = props => (
  <SnackbarContainer darkMode={false}>{props.children}</SnackbarContainer>
);

const RedirectDialogContent: FunctionComponent<{
  onClick: () => void;
  onDismiss: () => void;
}> = ({ onClick, onDismiss }) => {
  return (
    <div class={clsx("-cbwsdk-redirect-dialog")}>
      <style>{css}</style>
      <div class="-cbwsdk-redirect-dialog-backdrop" onClick={onDismiss} />
      <div class="-cbwsdk-redirect-dialog-box">
        <p>Redirecting to Coinbase Wallet ...</p>
        <button onClick={onClick}>Open</button>
      </div>
    </div>
  );
};

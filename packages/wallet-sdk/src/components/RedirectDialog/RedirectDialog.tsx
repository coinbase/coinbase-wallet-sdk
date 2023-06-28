import clsx from "clsx";
import { FunctionComponent, h, render } from "preact";
import { useCallback } from "preact/hooks";

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

  public presentItem(redirectUrl: string): void {
    this.render(redirectUrl);
  }

  public clear(): void {
    this.render(null);
  }

  private render(redirectUrl: string | null): void {
    if (!this.root) return;
    render(null, this.root);

    if (!redirectUrl) return;
    render(
      <RedirectDialogContainer>
        <RedirectDialogContent
          redirectUrl={redirectUrl}
          onCancel={() => {
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
  redirectUrl: string;
  onCancel: () => void;
}> = ({ redirectUrl, onCancel }) => {
  const onClick = useCallback(() => {
    console.log("redirecting to", redirectUrl);
  }, []);

  return (
    <div class={clsx("-cbwsdk-redirect-dialog")}>
      <style>{css}</style>
      <div class="-cbwsdk-redirect-dialog-backdrop" onClick={onCancel} />
      <div class="-cbwsdk-redirect-dialog-box">
        <p>Redirecting to Coinbase Wallet ...</p>
        <button onClick={onClick}>Open</button>
      </div>
    </div>
  );
};

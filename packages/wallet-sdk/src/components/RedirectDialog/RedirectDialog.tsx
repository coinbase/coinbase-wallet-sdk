import clsx from "clsx";
import { FunctionComponent, h, render } from "preact";

import { injectCssReset } from "../../lib/cssReset";
import { SnackbarContainer } from "../Snackbar";
import css from "./RedirectDialog-css";

type RedirectDialogProps = {
  title: string;
  buttonText: string;
  onButtonClick: () => void;
};

export class RedirectDialog {
  private root: Element | null = null;

  public attach(): void {
    const el = document.documentElement;
    this.root = document.createElement("div");
    this.root.className = "-cbwsdk-css-reset";
    el.appendChild(this.root);
    injectCssReset();
  }

  public present(props: RedirectDialogProps): void {
    this.render(props);
  }

  public clear(): void {
    this.render(null);
  }

  private render(props: RedirectDialogProps | null): void {
    if (!this.root) return;
    render(null, this.root);

    if (!props) return;
    render(
      <RedirectDialogContent
        {...props}
        onDismiss={() => {
          this.clear();
        }}
      />,
      this.root,
    );
  }
}

const RedirectDialogContent: FunctionComponent<
  RedirectDialogProps & {
    onDismiss: () => void;
  }
> = ({ title, buttonText, onButtonClick, onDismiss }) => {
  return (
    <SnackbarContainer darkMode={false}>
      <div class={clsx("-cbwsdk-redirect-dialog")}>
        <style>{css}</style>
        <div class="-cbwsdk-redirect-dialog-backdrop" onClick={onDismiss} />
        <div class="-cbwsdk-redirect-dialog-box">
          <p>{title}</p>
          <button onClick={onButtonClick}>{buttonText}</button>
        </div>
      </div>
    </SnackbarContainer>
  );
};

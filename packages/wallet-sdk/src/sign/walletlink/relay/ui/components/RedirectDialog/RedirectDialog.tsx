import { clsx } from 'clsx';
import { FunctionComponent, h, render } from 'preact';

import { injectCssReset } from '../cssReset/cssReset.js';
import { SnackbarContainer } from '../Snackbar/Snackbar.js';
import { isDarkMode } from '../util.js';
import css from './RedirectDialog-css.js';

type RedirectDialogProps = {
  title: string;
  buttonText: string;
  onButtonClick: () => void;
};

export class RedirectDialog {
  private readonly darkMode: boolean;
  private root: Element | null = null;

  constructor() {
    this.darkMode = isDarkMode();
  }

  public attach(): void {
    const el = document.documentElement;
    this.root = document.createElement('div');
    this.root.className = '-cbwsdk-css-reset';
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
        darkMode={this.darkMode}
      />,
      this.root
    );
  }
}

const RedirectDialogContent: FunctionComponent<
  RedirectDialogProps & {
    onDismiss: () => void;
    darkMode: boolean;
  }
> = ({ title, buttonText, darkMode, onButtonClick, onDismiss }) => {
  const theme = darkMode ? 'dark' : 'light';

  return (
    <SnackbarContainer darkMode={darkMode}>
      <div class="-cbwsdk-redirect-dialog">
        <style>{css}</style>
        <div class="-cbwsdk-redirect-dialog-backdrop" onClick={onDismiss} />
        <div class={clsx('-cbwsdk-redirect-dialog-box', theme)}>
          <p>{title}</p>
          <button onClick={onButtonClick}>{buttonText}</button>
        </div>
      </div>
    </SnackbarContainer>
  );
};

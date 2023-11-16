import clsx from 'clsx';
import { FunctionComponent, h, render } from 'preact';

import { injectCssReset } from '../../../../../lib/cssReset';
import { SnackbarContainer } from '../Snackbar';
import css from './RedirectDialog-css';

type RedirectDialogProps = {
  title: string;
  buttonText: string;
  darkMode: boolean;
  onButtonClick: () => void;
};

export class RedirectDialog {
  private root: Element | null = null;

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
      />,
      this.root
    );
  }
}

const RedirectDialogContent: FunctionComponent<
  RedirectDialogProps & {
    onDismiss: () => void;
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

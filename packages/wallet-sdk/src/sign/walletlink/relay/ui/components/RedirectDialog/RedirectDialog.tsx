import { clsx } from 'clsx';
import { FunctionComponent, render } from 'preact';
// biome-ignore lint/correctness/noUnusedImports: preact
import { h } from 'preact';
import { useEffect, useId, useRef } from 'preact/hooks';

import { SnackbarContainer } from '../Snackbar/Snackbar.js';
import { injectCssReset } from '../cssReset/cssReset.js';
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

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const RedirectDialogContent: FunctionComponent<
  RedirectDialogProps & {
    onDismiss: () => void;
    darkMode: boolean;
  }
> = ({ title, buttonText, darkMode, onButtonClick, onDismiss }) => {
  const theme = darkMode ? 'dark' : 'light';
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const dialogEl = dialogRef.current;
    if (!dialogEl) {
      return;
    }

    const focusables = () =>
      Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
      );

    const initialFocus = focusables()[0] ?? dialogEl;
    initialFocus.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        dialogEl.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !dialogEl.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogEl.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [onDismiss]);

  return (
    <SnackbarContainer darkMode={darkMode}>
      <div class="-cbwsdk-redirect-dialog">
        <style>{css}</style>
        <div class="-cbwsdk-redirect-dialog-backdrop" onClick={onDismiss} aria-hidden="true" />
        <div
          ref={dialogRef}
          class={clsx('-cbwsdk-redirect-dialog-box', theme)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
        >
          <p id={titleId}>{title}</p>
          <button type="button" onClick={onButtonClick}>
            {buttonText}
          </button>
        </div>
      </div>
    </SnackbarContainer>
  );
};

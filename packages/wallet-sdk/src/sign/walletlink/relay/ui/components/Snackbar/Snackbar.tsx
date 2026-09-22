// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { clsx } from 'clsx';
import { FunctionComponent, h, render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { isDarkMode } from '../util.js';
import css from './Snackbar-css.js';

const coinbaseWalletLogo = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAxNjQuMzE0IDE2NC42MjMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik04Mi4zMTE1IDEyMy40NjdDNTkuNTczIDEyMy40NjcgNDEuMTU1OCAxMDUuMDUgNDEuMTU1OCA4Mi4zMTJDNDEuMTU1OCA1OS41NzMgNTkuNTczIDQxLjE1NiA4Mi4zMTE1IDQxLjE1NkMxMDIuNjg0IDQxLjE1NiAxMTkuNTkyIDU2LjAwNiAxMjIuODUgNzUuNDUySDE2NC4zMTRDMTYwLjgxNiAzMy4xOTkgMTI1LjQ1NiAwIDgyLjMxMTUgMEMzNi44Njg3IDAgMCAzNi44NjkgMCA4Mi4zMTJDMCAxMjcuNzU0IDM2Ljg2ODcgMTY0LjYyMyA4Mi4zMTE1IDE2NC42MjNDMTI1LjQ1NiAxNjQuNjIzIDE2MC44MTYgMTMxLjQyNCAxNjQuMzE0IDg5LjE3MUgxMjIuODVDMTE5LjU5MiAxMDguNjE3IDEwMi42ODQgMTIzLjQ2NyA4Mi4zMTE1IDEyMy40NjdaIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMTYyNTdfNjAwNykiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xNjI1N182MDA3IiB4MT0iMjAuOTA5NCIgeTE9IjAiIHgyPSIxNjUuMTM1IiB5Mj0iMTQ0LjMwNyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBvZmZzZXQ9IjAuMDM0NzYwOSIgc3RvcC1jb2xvcj0iIzAwMDBGRiIvPgo8c3RvcCBvZmZzZXQ9IjAuNDM0Njk4IiBzdG9wLWNvbG9yPSIjMDBDNEZGIi8+CjxzdG9wIG9mZnNldD0iMC43MTczNDkiIHN0b3AtY29sb3I9IiMwMEZGRkYiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkZFRTdEIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+`;
const gearIcon = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDYuNzV2LTEuNWwtMS43Mi0uNTdjLS4wOC0uMjctLjE5LS41Mi0uMzItLjc3bC44MS0xLjYyLTEuMDYtMS4wNi0xLjYyLjgxYy0uMjQtLjEzLS41LS4yNC0uNzctLjMyTDYuNzUgMGgtMS41bC0uNTcgMS43MmMtLjI3LjA4LS41My4xOS0uNzcuMzJsLTEuNjItLjgxLTEuMDYgMS4wNi44MSAxLjYyYy0uMTMuMjQtLjI0LjUtLjMyLjc3TDAgNS4yNXYxLjVsMS43Mi41N2MuMDguMjcuMTkuNTMuMzIuNzdsLS44MSAxLjYyIDEuMDYgMS4wNiAxLjYyLS44MWMuMjQuMTMuNS4yMy43Ny4zMkw1LjI1IDEyaDEuNWwuNTctMS43MmMuMjctLjA4LjUyLS4xOS43Ny0uMzJsMS42Mi44MSAxLjA2LTEuMDYtLjgxLTEuNjJjLjEzLS4yNC4yMy0uNS4zMi0uNzdMMTIgNi43NXpNNiA4LjVhMi41IDIuNSAwIDAxMC01IDIuNSAyLjUgMCAwMTAgNXoiIGZpbGw9IiMwNTBGMTkiLz48L3N2Zz4=`;

export interface SnackbarInstanceProps {
  message?: string;
  menuItems?: SnackbarMenuItem[];
  autoExpand?: boolean;
}

export interface SnackbarMenuItem {
  isRed: boolean;
  info: string;
  svgWidth: string;
  svgHeight: string;
  path: string;
  defaultFillRule: 'inherit' | 'evenodd';
  defaultClipRule: 'inherit' | 'evenodd';
  onClick: () => void;
}

export class Snackbar {
  private readonly darkMode: boolean;
  private readonly items = new Map<number, SnackbarInstanceProps>();

  private nextItemKey = 0;
  private root: Element | null = null;

  constructor() {
    this.darkMode = isDarkMode();
  }

  public attach(el: Element): void {
    this.root = document.createElement('div');

    this.root.className = '-cbwsdk-snackbar-root';
    el.appendChild(this.root);

    this.render();
  }

  public presentItem(itemProps: SnackbarInstanceProps): () => void {
    const key = this.nextItemKey++;
    this.items.set(key, itemProps);
    this.render();

    return () => {
      this.items.delete(key);
      this.render();
    };
  }

  public clear(): void {
    this.items.clear();
    this.render();
  }

  private render(): void {
    if (!this.root) {
      return;
    }
    render(
      <div>
        <SnackbarContainer darkMode={this.darkMode}>
          {Array.from(this.items.entries()).map(([key, itemProps]) => (
            <SnackbarInstance {...itemProps} key={key} />
          ))}
        </SnackbarContainer>
      </div>,
      this.root
    );
  }
}

export const SnackbarContainer: FunctionComponent<{
  darkMode: boolean;
}> = (props) => (
  <div class={clsx('-cbwsdk-snackbar-container')}>
    <style>{css}</style>
    <div class="-cbwsdk-snackbar">{props.children}</div>
  </div>
);

export const SnackbarInstance: FunctionComponent<SnackbarInstanceProps> = ({
  autoExpand,
  message,
  menuItems,
}) => {
  const [hidden, setHidden] = useState(true);
  const [expanded, setExpanded] = useState(autoExpand ?? false);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        setHidden(false);
      }, 1),
      window.setTimeout(() => {
        setExpanded(true);
      }, 10000),
    ];

    return () => {
      timers.forEach(window.clearTimeout);
    };
  });

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <div
      class={clsx(
        '-cbwsdk-snackbar-instance',
        hidden && '-cbwsdk-snackbar-instance-hidden',
        expanded && '-cbwsdk-snackbar-instance-expanded'
      )}
    >
      <div class="-cbwsdk-snackbar-instance-header" onClick={toggleExpanded}>
        <img
          src={coinbaseWalletLogo}
          alt="Coinbase Wallet"
          class="-cbwsdk-snackbar-instance-header-cblogo"
        />{' '}
        <div class="-cbwsdk-snackbar-instance-header-message">{message}</div>
        <div class="-gear-container">
          {!expanded && (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="12" fill="#F5F7F8" />
            </svg>
          )}
          <img src={gearIcon} class="-gear-icon" title="Expand" />
        </div>
      </div>
      {menuItems && menuItems.length > 0 && (
        <div class="-cbwsdk-snackbar-instance-menu">
          {menuItems.map((action, i) => (
            <div
              class={clsx(
                '-cbwsdk-snackbar-instance-menu-item',
                action.isRed && '-cbwsdk-snackbar-instance-menu-item-is-red'
              )}
              onClick={action.onClick}
              key={i}
            >
              <svg
                width={action.svgWidth}
                height={action.svgHeight}
                viewBox="0 0 10 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill-rule={action.defaultFillRule}
                  clip-rule={action.defaultClipRule}
                  d={action.path}
                  fill="#AAAAAA"
                />
              </svg>
              <span
                class={clsx(
                  '-cbwsdk-snackbar-instance-menu-item-info',
                  action.isRed && '-cbwsdk-snackbar-instance-menu-item-info-is-red'
                )}
              >
                {action.info}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

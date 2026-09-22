// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { clsx } from 'clsx';
import { FunctionComponent, render } from 'preact';
// biome-ignore lint/correctness/noUnusedImports: preact
import { h } from 'preact';

import { useEffect, useState } from 'preact/hooks';

import { isDarkMode } from '../util.js';
import css from './Snackbar-css.js';

const coinbaseWalletLogo = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTY1IiBoZWlnaHQ9IjE2NSIgdmlld0JveD0iMCAwIDE2NC4zMTQgMTY0LjYyMyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTgyLjMxMTUgMTIzLjQ2N0M1OS41NzMgMTIzLjQ2NyA0MS4xNTU4IDEwNS4wNSA0MS4xNTU4IDgyLjMxMkM0MS4xNTU4IDU5LjU3MyA1OS41NzMgNDEuMTU2IDgyLjMxMTUgNDEuMTU2QzEwMi42ODQgNDEuMTU2IDExOS41OTIgNTYuMDA2IDEyMi44NSA3NS40NTJIMTY0LjMxNEMxNjAuODE2IDMzLjE5OSAxMjUuNDU2IDAgODIuMzExNSAwQzM2Ljg2ODcgMCAwIDM2Ljg2OSAwIDgyLjMxMkMwIDEyNy43NTQgMzYuODY4NyAxNjQuNjIzIDgyLjMxMTUgMTY0LjYyM0MxMjUuNDU2IDE2NC42MjMgMTYwLjgxNiAxMzEuNDI0IDE2NC4zMTQgODkuMTcxSDEyMi44NUMxMTkuNTkyIDEwOC42MTcgMTAyLjY4NCAxMjMuNDY3IDgyLjMxMTUgMTIzLjQ2N1oiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl8xNjI1N182MDA3KSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzE2MjU3XzYwMDciIHgxPSIyMC45MDk0IiB5MT0iMCIgeDI9IjE2NS4xMzUiIHkyPSIxNDQuMzA3IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIG9mZnNldD0iMC4wMzQ3NjA5IiBzdG9wLWNvbG9yPSIjMDAwMEZGIi8+CjxzdG9wIG9mZnNldD0iMC40MzQ2OTgiIHN0b3AtY29sb3I9IiMwMEM0RkYiLz4KPHN0b3Agb2Zmc2V0PSIwLjcxNzM0OSIgc3RvcC1jb2xvcj0iIzAwRkZGRiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRkVFN0QiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K`;
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

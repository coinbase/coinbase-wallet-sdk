// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import clsx from "clsx";
import { FunctionComponent, h, render } from "preact";
import { useEffect, useState } from "preact/hooks";

import css from "./Snackbar-css";

const gearIcon = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDYuNzV2LTEuNWwtMS43Mi0uNTdjLS4wOC0uMjctLjE5LS41Mi0uMzItLjc3bC44MS0xLjYyLTEuMDYtMS4wNi0xLjYyLjgxYy0uMjQtLjEzLS41LS4yNC0uNzctLjMyTDYuNzUgMGgtMS41bC0uNTcgMS43MmMtLjI3LjA4LS41My4xOS0uNzcuMzJsLTEuNjItLjgxLTEuMDYgMS4wNi44MSAxLjYyYy0uMTMuMjQtLjI0LjUtLjMyLjc3TDAgNS4yNXYxLjVsMS43Mi41N2MuMDguMjcuMTkuNTMuMzIuNzdsLS44MSAxLjYyIDEuMDYgMS4wNiAxLjYyLS44MWMuMjQuMTMuNS4yMy43Ny4zMkw1LjI1IDEyaDEuNWwuNTctMS43MmMuMjctLjA4LjUyLS4xOS43Ny0uMzJsMS42Mi44MSAxLjA2LTEuMDYtLjgxLTEuNjJjLjEzLS4yNC4yMy0uNS4zMi0uNzdMMTIgNi43NXpNNiA4LjVhMi41IDIuNSAwIDAxMC01IDIuNSAyLjUgMCAwMTAgNXoiIGZpbGw9IiMwNTBGMTkiLz48L3N2Zz4=`;

function makeSnackbarIcon(appSrc?: string | null) {
  switch (appSrc) {
    case "coinbase-app":
      return `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE0LjY3NCAxOC44NThjLTIuMDQ1IDAtMy42NDgtMS43MjItMy42NDgtMy44NDVzMS42NTktMy44NDUgMy42NDgtMy44NDVjMS44MjQgMCAzLjMxNyAxLjM3NyAzLjU5MyAzLjIxNGgzLjcwM2MtLjMzMS0zLjk2LTMuNDgyLTcuMDU5LTcuMjk2LTcuMDU5LTQuMDM0IDAtNy4zNSAzLjQ0My03LjM1IDcuNjkgMCA0LjI0NiAzLjI2IDcuNjkgNy4zNSA3LjY5IDMuODcgMCA2Ljk2NS0zLjEgNy4yOTYtNy4wNTloLTMuNzAzYy0uMjc2IDEuODM2LTEuNzY5IDMuMjE0LTMuNTkzIDMuMjE0WiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0wIDEwLjY3OGMwLTMuNzExIDAtNS41OTYuNzQyLTcuMDIzQTYuNTMyIDYuNTMyIDAgMCAxIDMuNjU1Ljc0MkM1LjA4MiAwIDYuOTY3IDAgMTAuNjc4IDBoNy45MzhjMy43MTEgMCA1LjU5NiAwIDcuMDIzLjc0MmE2LjUzMSA2LjUzMSAwIDAgMSAyLjkxMyAyLjkxM2MuNzQyIDEuNDI3Ljc0MiAzLjMxMi43NDIgNy4wMjN2Ny45MzhjMCAzLjcxMSAwIDUuNTk2LS43NDIgNy4wMjNhNi41MzEgNi41MzEgMCAwIDEtMi45MTMgMi45MTNjLTEuNDI3Ljc0Mi0zLjMxMi43NDItNy4wMjMuNzQyaC03LjkzOGMtMy43MTEgMC01LjU5NiAwLTcuMDIzLS43NDJhNi41MzEgNi41MzEgMCAwIDEtMi45MTMtMi45MTNDMCAyNC4yMTIgMCAyMi4zODQgMCAxOC42MTZ2LTcuOTM4WiIgZmlsbD0iIzAwNTJGRiIvPjxwYXRoIGQ9Ik0xNC42ODQgMTkuNzczYy0yLjcyNyAwLTQuODY0LTIuMjk1LTQuODY0LTUuMTI2IDAtMi44MzEgMi4yMS01LjEyNyA0Ljg2NC01LjEyNyAyLjQzMiAwIDQuNDIyIDEuODM3IDQuNzkgNC4yODVoNC45MzhjLS40NDItNS4yOC00LjY0My05LjQxMS05LjcyOC05LjQxMS01LjM4IDAtOS44MDIgNC41OS05LjgwMiAxMC4yNTMgMCA1LjY2MiA0LjM0OCAxMC4yNTMgOS44MDIgMTAuMjUzIDUuMTU5IDAgOS4yODYtNC4xMzIgOS43MjgtOS40MTFoLTQuOTM4Yy0uMzY4IDIuNDQ4LTIuMzU4IDQuMjg0LTQuNzkgNC4yODRaIiBmaWxsPSIjZmZmIi8+PC9zdmc+`;
    case "coinbase-wallet-app":
    default:
      return `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEuNDkyIDEwLjQxOWE4LjkzIDguOTMgMCAwMTguOTMtOC45M2gxMS4xNjNhOC45MyA4LjkzIDAgMDE4LjkzIDguOTN2MTEuMTYzYTguOTMgOC45MyAwIDAxLTguOTMgOC45M0gxMC40MjJhOC45MyA4LjkzIDAgMDEtOC45My04LjkzVjEwLjQxOXoiIGZpbGw9IiMxNjUyRjAiLz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTEwLjQxOSAwSDIxLjU4QzI3LjMzNSAwIDMyIDQuNjY1IDMyIDEwLjQxOVYyMS41OEMzMiAyNy4zMzUgMjcuMzM1IDMyIDIxLjU4MSAzMkgxMC40MkM0LjY2NSAzMiAwIDI3LjMzNSAwIDIxLjU4MVYxMC40MkMwIDQuNjY1IDQuNjY1IDAgMTAuNDE5IDB6bTAgMS40ODhhOC45MyA4LjkzIDAgMDAtOC45MyA4LjkzdjExLjE2M2E4LjkzIDguOTMgMCAwMDguOTMgOC45M0gyMS41OGE4LjkzIDguOTMgMCAwMDguOTMtOC45M1YxMC40MmE4LjkzIDguOTMgMCAwMC04LjkzLTguOTNIMTAuNDJ6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xNS45OTggMjYuMDQ5Yy01LjU0OSAwLTEwLjA0Ny00LjQ5OC0xMC4wNDctMTAuMDQ3IDAtNS41NDggNC40OTgtMTAuMDQ2IDEwLjA0Ny0xMC4wNDYgNS41NDggMCAxMC4wNDYgNC40OTggMTAuMDQ2IDEwLjA0NiAwIDUuNTQ5LTQuNDk4IDEwLjA0Ny0xMC4wNDYgMTAuMDQ3eiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0xMi43NjIgMTQuMjU0YzAtLjgyMi42NjctMS40ODkgMS40ODktMS40ODloMy40OTdjLjgyMiAwIDEuNDg4LjY2NiAxLjQ4OCAxLjQ4OXYzLjQ5N2MwIC44MjItLjY2NiAxLjQ4OC0xLjQ4OCAxLjQ4OGgtMy40OTdhMS40ODggMS40ODggMCAwMS0xLjQ4OS0xLjQ4OHYtMy40OTh6IiBmaWxsPSIjMTY1MkYwIi8+PC9zdmc+`;
  }
}

export interface SnackbarOptions {
  darkMode: boolean;
}

export interface SnackbarInstanceProps {
  message?: string;
  menuItems?: SnackbarMenuItem[];
  autoExpand?: boolean;
  appSrc?: string | null;
}

export interface SnackbarMenuItem {
  isRed: boolean;
  info: string;
  svgWidth: string;
  svgHeight: string;
  path: string;
  defaultFillRule: string;
  defaultClipRule: string;
  onClick: () => void;
}

export class Snackbar {
  private readonly darkMode: boolean;
  private readonly items = new Map<number, SnackbarInstanceProps>();

  private nextItemKey = 0;
  private root: Element | null = null;

  constructor(options: Readonly<SnackbarOptions>) {
    this.darkMode = options.darkMode;
  }

  public attach(el: Element): void {
    this.root = document.createElement("div");

    this.root.className = "-cbwsdk-snackbar-root";
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
      this.root,
    );
  }
}

export const SnackbarContainer: FunctionComponent<{
  darkMode: boolean;
}> = props => (
  <div class={clsx("-cbwsdk-snackbar-container")}>
    <style>{css}</style>
    <div class="-cbwsdk-snackbar">{props.children}</div>
  </div>
);

export const SnackbarInstance: FunctionComponent<SnackbarInstanceProps> = ({
  autoExpand,
  message,
  menuItems,
  appSrc,
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
        "-cbwsdk-snackbar-instance",
        hidden && "-cbwsdk-snackbar-instance-hidden",
        expanded && "-cbwsdk-snackbar-instance-expanded",
      )}
    >
      <div class="-cbwsdk-snackbar-instance-header" onClick={toggleExpanded}>
        <img
          src={makeSnackbarIcon(appSrc)}
          class="-cbwsdk-snackbar-instance-header-cblogo"
        />
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
                "-cbwsdk-snackbar-instance-menu-item",
                action.isRed && "-cbwsdk-snackbar-instance-menu-item-is-red",
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
                  "-cbwsdk-snackbar-instance-menu-item-info",
                  action.isRed &&
                    "-cbwsdk-snackbar-instance-menu-item-info-is-red",
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

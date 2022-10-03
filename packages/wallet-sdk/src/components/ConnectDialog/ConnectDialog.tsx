// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import clsx from "clsx";
import { useEffect, useState } from "preact/hooks";

import { ConnectContent } from "../ConnectContent/ConnectContent";
import { TryExtensionContent } from "../TryExtensionContent/TryExtensionContent";
import css from "./ConnectDialog-css";

type ConnectDialogProps = {
  darkMode: boolean;
  version: string;
  sessionId: string;
  sessionSecret: string;
  linkAPIUrl: string;
  isOpen: boolean;
  isConnected: boolean;
  isParentConnection: boolean;
  chainId: number;
  connectDisabled: boolean;
  onCancel: (() => void) | null;
};

export const ConnectDialog = (props: ConnectDialogProps) => {
  const { isOpen, darkMode } = props;
  const [isContainerHidden, setContainerHidden] = useState(!isOpen);
  const [isDialogHidden, setDialogHidden] = useState(!isOpen);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        setDialogHidden(!isOpen);
      }, 10),
    ];

    if (isOpen) {
      setContainerHidden(false);
    } else {
      timers.push(
        window.setTimeout(() => {
          setContainerHidden(true);
        }, 360),
      );
    }

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [props.isOpen]);

  const theme = darkMode ? "dark" : "light";

  return (
    <div
      class={clsx(
        "-cbwsdk-extension-dialog-container",
        isContainerHidden && "-cbwsdk-extension-dialog-container-hidden",
      )}
    >
      <style>{css}</style>
      <div
        class={clsx(
          "-cbwsdk-extension-dialog-backdrop",
          theme,
          isDialogHidden && "-cbwsdk-extension-dialog-backdrop-hidden",
        )}
      />
      <div class="-cbwsdk-extension-dialog">
        <div
          class={clsx(
            "-cbwsdk-extension-dialog-box",
            isDialogHidden && "-cbwsdk-extension-dialog-box-hidden",
          )}
        >
          {!props.connectDisabled ? (
            <ConnectContent
              theme={theme}
              version={props.version}
              sessionId={props.sessionId}
              sessionSecret={props.sessionSecret}
              linkAPIUrl={props.linkAPIUrl}
              isConnected={props.isConnected}
              isParentConnection={props.isParentConnection}
              chainId={props.chainId}
              onCancel={props.onCancel}
            />
          ) : null}
          <TryExtensionContent theme={theme} />
        </div>
      </div>
    </div>
  );
};

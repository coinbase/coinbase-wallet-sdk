// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import clsx from 'clsx';
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { ConnectContent } from '../ConnectContent/ConnectContent';
import { TryExtensionContent } from '../TryExtensionContent/TryExtensionContent';
import css from './ConnectDialog-css';

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
  const [containerHidden, setContainerHidden] = useState(!isOpen);
  const [dialogHidden, setDialogHidden] = useState(!isOpen);

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
        }, 360)
      );
    }

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [isOpen]);

  const theme = darkMode ? 'dark' : 'light';

  return (
    <div
      class={clsx(
        '-cbwsdk-connect-dialog-container',
        containerHidden && '-cbwsdk-connect-dialog-container-hidden'
      )}
    >
      <style>{css}</style>
      <div
        class={clsx(
          '-cbwsdk-connect-dialog-backdrop',
          theme,
          dialogHidden && '-cbwsdk-connect-dialog-backdrop-hidden'
        )}
      />
      <div class="-cbwsdk-connect-dialog">
        <div
          class={clsx(
            '-cbwsdk-connect-dialog-box',
            dialogHidden && '-cbwsdk-connect-dialog-box-hidden'
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

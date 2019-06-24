// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage } from "./types/IPCMessage"

export function postMessageToParent(
  message: IPCMessage,
  origin: string = "*"
): void {
  if (window.parent === window) {
    return
  }

  window.parent.postMessage(message, origin)
}

export function postMessageToOpener(
  message: IPCMessage,
  origin: string = "*"
): void {
  if (!window.opener) {
    return
  }

  window.opener.postMessage(message, origin)
}

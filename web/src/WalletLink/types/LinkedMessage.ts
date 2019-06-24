// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface LinkedMessage extends IPCMessage<IPCMessageType.LINKED> {}

export function LinkedMessage(): LinkedMessage {
  return { type: IPCMessageType.LINKED }
}

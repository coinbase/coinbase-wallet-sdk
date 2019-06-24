// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface LinkedMessage extends IPCMessage<IPCMessageType.LINKED> {}

export function isLinkedMessage(msg: any): msg is LinkedMessage {
  return msg && msg.type === IPCMessageType.LINKED
}

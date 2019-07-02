// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface SessionIdRequestMessage
  extends IPCMessage<IPCMessageType.SESSION_ID_REQUEST> {}

export function SessionIdRequestMessage(): SessionIdRequestMessage {
  return { type: IPCMessageType.SESSION_ID_REQUEST }
}

// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface SessionIdResponseMessage
  extends IPCMessage<IPCMessageType.SESSION_ID_RESPONSE> {
  sessionId: string
}

export function isSessionIdResponseMessage(
  msg: any
): msg is SessionIdResponseMessage {
  return msg && msg.type === IPCMessageType.SESSION_ID_RESPONSE
}

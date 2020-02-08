// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface SessionIdResponseMessage
  extends IPCMessage<IPCMessageType.SESSION_ID_RESPONSE> {
  sessionId: string
}

export function SessionIdResponseMessage(
  sessionId: string
): SessionIdResponseMessage {
  return { type: IPCMessageType.SESSION_ID_RESPONSE, sessionId }
}

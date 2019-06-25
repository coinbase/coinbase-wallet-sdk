// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface Web3AccountsResponseMessage
  extends IPCMessage<IPCMessageType.WEB3_ACCOUNTS_RESPONSE> {
  addresses: string[]
}

export function isWeb3AccountsResponseMessage(
  msg: any
): msg is Web3AccountsResponseMessage {
  return msg && msg.type === IPCMessageType.WEB3_ACCOUNTS_RESPONSE
}

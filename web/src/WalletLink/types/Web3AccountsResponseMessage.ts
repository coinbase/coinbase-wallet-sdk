// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface Web3AccountsResponseMessage
  extends IPCMessage<IPCMessageType.WEB3_ACCOUNTS_RESPONSE> {
  addresses: string[]
}

export function Web3AccountsResponseMessage(
  addresses: string[]
): Web3AccountsResponseMessage {
  return { type: IPCMessageType.WEB3_ACCOUNTS_RESPONSE, addresses }
}

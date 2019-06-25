// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface Web3AccountsRequestMessage
  extends IPCMessage<IPCMessageType.WEB3_ACCOUNTS_REQUEST> {}

export function isWeb3AccountsRequestMessage(
  msg: any
): msg is Web3AccountsRequestMessage {
  return msg && msg.type === IPCMessageType.WEB3_ACCOUNTS_REQUEST
}

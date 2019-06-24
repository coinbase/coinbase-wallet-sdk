// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"
import { Web3Response } from "./Web3Response"

export interface Web3ResponseMessage
  extends IPCMessage<IPCMessageType.WEB3_RESPONSE> {
  type: IPCMessageType.WEB3_RESPONSE
  id: string
  response: Web3Response
}

export function Web3ResponseMessage(
  params: Omit<Web3ResponseMessage, "type">
): Web3ResponseMessage {
  return { type: IPCMessageType.WEB3_RESPONSE, ...params }
}

export function isWeb3ResponseMessage(msg: any): msg is Web3ResponseMessage {
  return msg && msg.type === IPCMessageType.WEB3_RESPONSE
}

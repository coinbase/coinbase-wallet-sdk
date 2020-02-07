// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"
import { Web3Request } from "./Web3Request"

export interface Web3RequestMessage
  extends IPCMessage<IPCMessageType.WEB3_REQUEST> {
  id: string
  request: Web3Request
}

export function Web3RequestMessage(
  params: Omit<Web3RequestMessage, "type">
): Web3RequestMessage {
  return { type: IPCMessageType.WEB3_REQUEST, ...params }
}

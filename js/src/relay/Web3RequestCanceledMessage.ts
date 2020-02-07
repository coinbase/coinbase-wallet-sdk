// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface Web3RequestCanceledMessage
  extends IPCMessage<IPCMessageType.WEB3_REQUEST_CANCELED> {
  id: string
}

export function Web3RequestCanceledMessage(
  id: string
): Web3RequestCanceledMessage {
  return { type: IPCMessageType.WEB3_REQUEST_CANCELED, id }
}

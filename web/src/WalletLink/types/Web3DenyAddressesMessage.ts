// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface Web3DenyAddressesMessage
  extends IPCMessage<IPCMessageType.WEB3_DENY_ADDRESSES> {}

export function Web3DenyAddressesMessage(): Web3DenyAddressesMessage {
  return { type: IPCMessageType.WEB3_DENY_ADDRESSES }
}

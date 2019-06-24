// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface Web3DenyAddressesMessage
  extends IPCMessage<IPCMessageType.WEB3_DENY_ADDRESSES> {}

export function isWeb3DenyAddressesMessage(
  msg: any
): msg is Web3DenyAddressesMessage {
  return msg && msg.type === IPCMessageType.WEB3_DENY_ADDRESSES
}

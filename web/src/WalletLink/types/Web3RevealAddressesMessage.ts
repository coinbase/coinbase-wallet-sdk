// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface Web3RevealAddressesMessage
  extends IPCMessage<IPCMessageType.WEB3_REVEAL_ADDRESSES> {
  addresses: string[]
}

export function Web3RevealAddressesMessage(
  params: Omit<Web3RevealAddressesMessage, "type">
): Web3RevealAddressesMessage {
  return { type: IPCMessageType.WEB3_REVEAL_ADDRESSES, ...params }
}

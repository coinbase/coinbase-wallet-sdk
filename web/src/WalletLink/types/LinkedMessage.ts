// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface LinkedMessage extends IPCMessage<IPCMessageType.LINKED> {}

export function LinkedMessage(): LinkedMessage {
  return { type: IPCMessageType.LINKED }
}

// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface LocalStorageBlockedMessage
  extends IPCMessage<IPCMessageType.LOCAL_STORAGE_BLOCKED> {}

export function LocalStorageBlockedMessage(): LocalStorageBlockedMessage {
  return { type: IPCMessageType.LOCAL_STORAGE_BLOCKED }
}

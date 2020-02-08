// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { RelayMessage, RelayMessageType } from "./RelayMessage"

export interface Web3RequestCanceledMessage
  extends RelayMessage<RelayMessageType.WEB3_REQUEST_CANCELED> {
  id: string
}

export function Web3RequestCanceledMessage(
  id: string
): Web3RequestCanceledMessage {
  return { type: RelayMessageType.WEB3_REQUEST_CANCELED, id }
}

// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { RelayMessage, RelayMessageType } from "./RelayMessage"
import { Web3Response } from "./Web3Response"

export interface Web3ResponseMessage
  extends RelayMessage<RelayMessageType.WEB3_RESPONSE> {
  type: RelayMessageType.WEB3_RESPONSE
  id: string
  response: Web3Response
}

export function Web3ResponseMessage(
  params: Omit<Web3ResponseMessage, "type">
): Web3ResponseMessage {
  return { type: RelayMessageType.WEB3_RESPONSE, ...params }
}

export function isWeb3ResponseMessage(msg: any): msg is Web3ResponseMessage {
  return msg && msg.type === RelayMessageType.WEB3_RESPONSE
}

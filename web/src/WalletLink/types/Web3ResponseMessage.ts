// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface Web3ResponseMessage
  extends IPCMessage<IPCMessageType.WEB3_RESPONSE> {
  id: string
  response: {
    method: string
    errorMessage?: string
    result?: any
  }
}

export function Web3ResponseMessage(
  params: Omit<Web3ResponseMessage, "type">
): Web3ResponseMessage {
  return { type: IPCMessageType.WEB3_RESPONSE, ...params }
}

export function isWeb3ResponseMessage(msg: any): msg is Web3ResponseMessage {
  return msg && msg.type === IPCMessageType.WEB3_RESPONSE
}

export interface SessionConfig {
  webhookId: string
  webhookUrl: string
  metadata: { [key: string]: string | undefined }
}

// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface Web3RequestCanceledMessage
  extends IPCMessage<IPCMessageType.WEB3_REQUEST_CANCELED> {
  id: string
}

export function isWeb3RequestCanceledMessage(
  msg: any
): msg is Web3RequestCanceledMessage {
  return msg && msg.type === IPCMessageType.WEB3_REQUEST_CANCELED
}

export interface Web3RequestCanceledMessageWithOrigin
  extends Web3RequestCanceledMessage {
  origin: string
}

export function Web3RequestCanceledMessageWithOrigin(
  requestMessage: Web3RequestCanceledMessage,
  origin: string
): Web3RequestCanceledMessageWithOrigin {
  return { ...requestMessage, origin }
}

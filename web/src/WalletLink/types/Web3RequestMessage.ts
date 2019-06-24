// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IPCMessage, IPCMessageType } from "./IPCMessage"

export interface Web3RequestMessage
  extends IPCMessage<IPCMessageType.WEB3_REQUEST> {
  id: string
  request: {
    method: string
    params: { [key: string]: any }
  }
}

export function isWeb3RequestMessage(msg: any): msg is Web3RequestMessage {
  return msg && msg.type === IPCMessageType.WEB3_REQUEST
}

export interface Web3RequestMessageWithOrigin extends Web3RequestMessage {
  origin: string
}

export function Web3RequestMessageWithOrigin(
  requestMessage: Web3RequestMessage,
  origin: string
): Web3RequestMessageWithOrigin {
  return { ...requestMessage, origin }
}

export interface RequestEthereumAddressesMessage
  extends Web3RequestMessageWithOrigin {
  request: {
    method: "requestEthereumAddresses"
    params: {
      appName: string
      appLogoUrl: string
    }
    origin: string
  }
}

export function isRequestEthereumAddressesMessage(
  msg: Web3RequestMessageWithOrigin
): msg is RequestEthereumAddressesMessage {
  return (
    isWeb3RequestMessage(msg) &&
    msg.request.method === "requestEthereumAddresses"
  )
}

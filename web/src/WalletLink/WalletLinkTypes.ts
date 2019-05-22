// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

export interface Web3RequestMessage {
  id: string
  request: {
    method: string
    params: object
  }
}

export function isWeb3RequestMessage(msg: any): msg is Web3RequestMessage {
  return (
    msg &&
    typeof msg.id === "string" &&
    typeof msg.request === "object" &&
    typeof msg.request.method === "string" &&
    typeof msg.request.params === "object"
  )
}

export interface Web3RequestMessageWithOrigin extends Web3RequestMessage {
  origin: string
}

export interface Web3ResponseMessage {
  id: string
  response: {
    errorMessage?: string | null
    result?: any
  }
}

export function isWeb3ResponseMessage(msg: any): msg is Web3ResponseMessage {
  return msg && typeof msg.id === "string" && typeof msg.response === "object"
}

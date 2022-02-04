// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IntNumber } from "../types"

export interface ServerMessage {
  type: string
  id?: IntNumber
}

export interface ServerMessageOK extends ServerMessage {
  type: "OK"
  id: IntNumber
  sessionId: string
}

export interface ServerMessageFail extends ServerMessage {
  type: "Fail"
  id: IntNumber
  sessionId: string
  error: string
}

export function isServerMessageFail(msg: any): msg is ServerMessageFail {
  return (
    msg &&
    msg.type === "Fail" &&
    typeof msg.id === "number" &&
    typeof msg.sessionId === "string" &&
    typeof msg.error === "string"
  )
}

export interface ServerMessageIsLinkedOK extends ServerMessage {
  type: "IsLinkedOK"
  id: IntNumber
  sessionId: string
  linked: boolean
  onlineGuests: number
}

export interface ServerMessageLinked extends ServerMessage {
  type: "Linked"
  sessionId: string
  onlineGuests: number
}

export interface ChainUpdate extends ServerMessage {
  type: "ChainUpdate",
  chainId: string,
  rpcUrl: string
}

export interface ServerMessageGetSessionConfigOK extends ServerMessage {
  type: "GetSessionConfigOK"
  id: IntNumber
  sessionId: string
  webhookId: string
  webhookUrl: string
  metadata: { [field: string]: string }
}

export interface ServerMessageSessionConfigUpdated extends ServerMessage {
  type: "SessionConfigUpdated"
  sessionId: string
  webhookId: string
  webhookUrl: string
  metadata: { [field: string]: string }
}

export interface ServerMessagePublishEventOK extends ServerMessage {
  type: "PublishEventOK"
  id: IntNumber
  sessionId: string
  eventId: string
}

export interface ServerMessageEvent extends ServerMessage {
  type: "Event"
  sessionId: string
  eventId: string
  event: string
  data: string
}

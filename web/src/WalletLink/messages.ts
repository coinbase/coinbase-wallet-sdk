// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

export interface WalletLinkMessage {
  type: string
  id?: number
}

export interface ServerMessage extends WalletLinkMessage {}

export interface ServerMessageOK extends ServerMessage {
  type: "OK"
  id: number
  sessionId: string
}

export interface ServerMessageFail extends ServerMessage {
  type: "Fail"
  id: number
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
  id: number
  sessionId: string
  linked: boolean
  onlineGuests: number
}

export interface ServerMessageLinked extends ServerMessage {
  type: "Linked"
  sessionId: string
  onlineGuests: number
}

export interface ServerMessageGetSessionConfigOK extends ServerMessage {
  type: "GetSessionConfigOK"
  id: number
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
  id: number
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

export interface ClientMessage extends WalletLinkMessage {
  id: number
}

export interface ClientMessageHostSession extends ClientMessage {
  type: "HostSession"
  sessionId: string
  sessionKey: string
}

export function ClientMessageHostSession(
  id: number,
  sessionId: string,
  sessionKey: string
): ClientMessageHostSession {
  return { type: "HostSession", id, sessionId, sessionKey }
}

export interface ClientMessageIsLinked extends ClientMessage {
  type: "IsLinked"
  sessionId: string
}

export function ClientMessageIsLinked(
  id: number,
  sessionId: string
): ClientMessageIsLinked {
  return { type: "IsLinked", id, sessionId }
}

export interface ClientMessageGetSessionConfig extends ClientMessage {
  type: "GetSessionConfig"
  sessionId: string
}

export function ClientMessageGetSessionConfig(
  id: number,
  sessionId: string
): ClientMessageGetSessionConfig {
  return { type: "GetSessionConfig", id, sessionId }
}

export interface ClientMessagePublishEvent extends ClientMessage {
  type: "PublishEvent"
  sessionId: string
  event: string
  data: string
  callWebhook: boolean
}

export function ClientMessagePublishEvent(
  id: number,
  sessionId: string,
  event: string,
  data: string,
  callWebhook: boolean
): ClientMessagePublishEvent {
  return { type: "PublishEvent", id, sessionId, event, data, callWebhook }
}

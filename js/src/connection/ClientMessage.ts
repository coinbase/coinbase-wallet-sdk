// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

export interface ClientMessage {
  type: string
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

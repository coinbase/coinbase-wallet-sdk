// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IntNumber } from "../types"

export interface ClientMessage {
  type: string
  id: IntNumber
}

export interface ClientMessageHostSession extends ClientMessage {
  type: "HostSession"
  sessionId: string
  sessionKey: string
}

export function ClientMessageHostSession(
  params: Omit<ClientMessageHostSession, "type">
): ClientMessageHostSession {
  return { type: "HostSession", ...params }
}

export interface ClientMessageIsLinked extends ClientMessage {
  type: "IsLinked"
  sessionId: string
}

export function ClientMessageIsLinked(
  params: Omit<ClientMessageIsLinked, "type">
): ClientMessageIsLinked {
  return { type: "IsLinked", ...params }
}

export interface ClientMessageGetSessionConfig extends ClientMessage {
  type: "GetSessionConfig"
  sessionId: string
}

export function ClientMessageGetSessionConfig(
  params: Omit<ClientMessageGetSessionConfig, "type">
): ClientMessageGetSessionConfig {
  return { type: "GetSessionConfig", ...params }
}

export interface ClientMessageSetSessionConfig extends ClientMessage {
  type: "SetSessionConfig"
  id: IntNumber
  sessionId: string
  webhookId?: string | null
  webhookUrl?: string | null
  metadata?: { [key: string]: string | null }
}

export function ClientMessageSetSessionConfig(
  params: Omit<ClientMessageSetSessionConfig, "type">
): ClientMessageSetSessionConfig {
  return { type: "SetSessionConfig", ...params }
}

export interface ClientMessagePublishEvent extends ClientMessage {
  type: "PublishEvent"
  sessionId: string
  event: string
  data: string
  callWebhook: boolean
}

export function ClientMessagePublishEvent(
  params: Omit<ClientMessagePublishEvent, "type">
): ClientMessagePublishEvent {
  return { type: "PublishEvent", ...params }
}

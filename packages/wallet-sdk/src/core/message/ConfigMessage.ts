import { UUID } from 'crypto';

import { Message } from '.';

export interface ConfigUpdateMessage extends Message {
  type: 'config';
  event: ConfigEvent;
  params?: unknown;
}

export function createConfigMessage(event: ConfigEvent, params?: unknown): ConfigUpdateMessage {
  return {
    type: 'config',
    id: crypto.randomUUID(),
    event,
    params,
  };
}

export enum ConfigEvent {
  PopupLoaded = 'popupLoaded',
  PopupUnload = 'popupUnload',

  SelectSignerType = 'selectSignerType',
  WalletLinkSession = 'WalletLinkSession',
  WalletLinkConnected = 'WalletLinkConnected',
}

export interface ConfigResponseMessage<T> extends Message {
  type: 'config';
  requestId: UUID;
  value: T;
}

export function responseForConfigUpdate<T>(
  message: ConfigUpdateMessage,
  response: T
): ConfigResponseMessage<T> {
  return {
    type: 'config',
    id: crypto.randomUUID(),
    requestId: message.id,
    value: response,
  };
}

export type SignerType = 'scw' | 'walletlink' | 'extension';

import { UUID } from 'crypto';

import { Message } from '.';

export interface ConfigUpdateMessage extends Message {
  type: 'config';
  event: ConfigEvent;
  params?: unknown;
}

export enum ConfigEvent {
  PopupLoaded = 'popupLoaded',
  PopupUnload = 'popupUnload',

  SelectSignerType = 'selectSignerType',
  WalletLinkSession = 'WalletLinkSession',
  WalletLinkConnected = 'WalletLinkConnected',
}

export interface ConfigResponseMessage extends Message {
  type: 'config';
  requestId: UUID;
  response: unknown;
}

export function responseForConfigUpdate(
  message: ConfigUpdateMessage,
  response: unknown
): ConfigResponseMessage {
  return {
    type: 'config',
    id: crypto.randomUUID(),
    requestId: message.id,
    response,
  };
}

export type SignerType = 'scw' | 'walletlink' | 'extension';

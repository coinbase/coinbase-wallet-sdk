import { UUID } from 'crypto';

import { Message } from '.';

export interface ConfigRequestMessage extends Message {
  type: 'config';
  event: ConfigEventType;
  params?: unknown;
}

export interface ConfigResponseMessage extends Message {
  type: 'config';
  requestId: UUID;
  response: unknown;
}

export type ConfigEventType = PopupSetupEvent | SignerConfigEvent | WalletLinkEvent;

export enum PopupSetupEvent {
  Loaded = 'popupLoaded',
  Unload = 'popupUnload',
}

export enum SignerConfigEvent {
  SelectSignerType = 'selectSignerType',
}

export enum WalletLinkEvent {
  RequestSession = 'WalletLinkSession',
  Connected = 'WalletLinkConnected',
}

export type SignerType = 'scw' | 'walletlink' | 'extension';

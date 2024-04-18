import { UUID } from 'crypto';

import { createMessage, Message } from '.';

interface ConfigMessage extends Message {
  type: 'config';
  data?: unknown;
}

export interface ConfigUpdateMessage extends ConfigMessage {
  event: PopupSetupEvent | SignerConfigEvent;
}

export interface ConfigResponseMessage extends ConfigMessage {
  requestId: UUID;
}

export enum PopupSetupEvent {
  Loaded = 'PopupLoaded',
  Unload = 'PopupUnload',
}

export enum SignerConfigEvent {
  SelectSignerType = 'selectSignerType',
  WalletLinkUpdate = 'WalletLinkUpdate',
}

export type SignerType = 'scw' | 'walletlink' | 'extension';

export function createConfigMessage(event: SignerConfigEvent, data?: unknown): ConfigUpdateMessage {
  return createMessage({
    type: 'config',
    event,
    data,
  });
}

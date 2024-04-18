import { UUID } from 'crypto';

import { createMessage, Message } from '.';

interface ConfigMessage extends Message {
  type: 'config';
  data?: unknown;
}

export interface ConfigUpdateMessage extends ConfigMessage {
  event: ConfigEvent;
}

export interface ConfigResponseMessage extends ConfigMessage {
  requestId: UUID;
}

type ConfigEvent = PopupSetupEvent | SignerConfigEvent;

export enum PopupSetupEvent {
  Loaded = 'PopupLoaded',
  Unload = 'PopupUnload',
}

export enum SignerConfigEvent {
  SelectSignerType = 'selectSignerType',
  WalletLinkUpdate = 'WalletLinkUpdate',
}

export type SignerType = 'scw' | 'walletlink' | 'extension';

export function createConfigMessage(event: ConfigEvent, data?: unknown): ConfigUpdateMessage {
  return createMessage({
    type: 'config',
    event,
    data,
  });
}

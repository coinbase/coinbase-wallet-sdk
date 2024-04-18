import { UUID } from 'crypto';

import { Message } from '.';

export interface ConfigUpdateMessage extends Message {
  event: ConfigEvent;
  data?: unknown;
}

export interface ConfigResponseMessage extends Message {
  requestId: UUID;
  data?: unknown;
}

export enum ConfigEvent {
  PopupLoaded = 'PopupLoaded',
  PopupUnload = 'PopupUnload',

  SelectSignerType = 'selectSignerType',
  WalletLinkUpdate = 'WalletLinkUpdate',
}

export type SignerType = 'scw' | 'walletlink' | 'extension';

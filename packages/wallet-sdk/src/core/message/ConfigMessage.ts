import { Message, MessageID } from '.';

export interface ConfigUpdateMessage extends Message {
  event: ConfigEvent;
  data?: unknown;
}

export function isConfigUpdateMessage(message: Message): message is ConfigUpdateMessage {
  return (message as ConfigUpdateMessage).event !== undefined;
}

export interface ConfigResponseMessage extends Message {
  requestId: MessageID;
  data?: unknown;
}

export enum ConfigEvent {
  PopupLoaded = 'PopupLoaded',
  PopupUnload = 'PopupUnload',

  SelectSignerType = 'selectSignerType',
  WalletLinkUpdate = 'WalletLinkUpdate',
}

export type SignerType = 'scw' | 'walletlink' | 'extension';

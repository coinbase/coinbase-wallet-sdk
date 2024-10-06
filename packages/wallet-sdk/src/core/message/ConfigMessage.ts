import { Message } from './Message.js';

export interface ConfigMessage extends Message {
  event: ConfigEvent;
}

export type ConfigEvent =
  | 'PopupLoaded'
  | 'PopupUnload'
  | 'selectSignerType'
  | 'WalletLinkSessionRequest'
  | 'WalletLinkUpdate';

export type SignerType = 'scw' | 'walletlink';

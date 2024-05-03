import { Message } from './Message';

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

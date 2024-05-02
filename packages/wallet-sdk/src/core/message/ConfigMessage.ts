import { Message } from './Message';

export interface ConfigMessage extends Message {
  event: ConfigEvent;
}

export type ConfigEvent =
  | 'PopupLoaded'
  | 'PopupUnload'
  | 'WalletLinkSessionRequest'
  | 'selectSignerType'
  | 'WalletLinkUpdate';

export type SignerType = 'scw' | 'walletlink' | 'extension';

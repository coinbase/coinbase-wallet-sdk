import { Message } from './Message';

export interface ConfigMessage extends Message {
  event: ConfigEvent;
  data?: unknown;
}

export type ConfigEvent =
  | 'PopupLoaded'
  | 'PopupUnload'
  | 'WalletLinkSessionRequest'
  | 'selectSignerType'
  | 'WalletLinkUpdate';

export type SignerType = 'scw' | 'walletlink' | 'extension';

import { Message } from ':core/communicator/Message';

export interface ConfigMessage extends Message {
  type: 'config';
  event: {
    type: ClientConfigEventType | HostConfigEventType;
    value?: unknown;
  };
}

export enum ClientConfigEventType {
  SelectConnectionType = 'selectConnectionType',
  DappOriginMessage = 'dappOriginMessage',
  WalletLinkUrl = 'walletLinkUrl',
  WalletLinkQrScanned = 'walletLinkQrScanned',
}

export enum HostConfigEventType {
  PopupListenerAdded = 'popupListenerAdded',
  PopupReadyForRequest = 'popupReadyForRequest',
  ConnectionTypeSelected = 'connectionTypeSelected',
  RequestWalletLinkUrl = 'requestWalletLinkUrl',
  PopupUnload = 'popupUnload',
}

export type SignerType = 'scw' | 'walletlink' | 'extension';

export function isConfigMessage(msg: Message): msg is ConfigMessage {
  return msg.type === 'config' && 'event' in msg;
}

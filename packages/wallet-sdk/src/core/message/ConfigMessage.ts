import { Message } from '.';

export interface ConfigMessage extends Message {
  type: 'config';
  event: ConfigEventType;
  params?: unknown;
}

export type ConfigEventType =
  | PopupSetupEventType
  | SignerConfigEventType
  | WalletLinkConfigEventType;

export enum PopupSetupEventType {
  // 1. popup to dapp, after popup gets opened
  PopupHello = 'popupHello',

  // 2. dapp to popup, after PopupHello is received
  DappHello = 'dappHello',

  // X. at some point later.... when popup is about to close
  PopupUnload = 'popupUnload',
}

export enum SignerConfigEventType {
  // 1. dapp to popup, after the popup setup process
  DappSelectSignerType = 'dappSelectSignerType',

  // 2. popup to dapp, after user selected the signer
  PopupSignerTypeSelected = 'popupSignerTypeSelected',
}

export enum WalletLinkConfigEventType {
  // 1. dapp to popup, to respond with walletlink URL
  DappWalletLinkUrlResponse = 'dappWalletLinkUrlResponse',

  // 2. dapp to popup, walletlink scanned, closing the popup
  DappWalletLinkConnected = 'dappWalletLinkConnected',
}

export type SignerType = 'scw' | 'walletlink' | 'extension';

export function isConfigMessage(msg: Message): msg is ConfigMessage {
  return msg.type === 'config' && 'event' in msg;
}

import { Message, MessageID } from '.';

export type ConfigUpdateMessage = ScopedConfigMessage<'popup'> | ScopedConfigMessage<'signer'>;

export function isConfigUpdateMessage(message: Message): message is ConfigUpdateMessage {
  return (
    'scope' in message &&
    'event' in message &&
    (message.scope === 'popup' || message.scope === 'signer')
  );
}

export type ConfigResponseMessage = Message & {
  requestId: MessageID;
  data?: unknown;
};

export enum PopupConfigEvent {
  Loaded = 'PopupLoaded',
  Unload = 'PopupUnload',
}

export enum SignerConfigEvent {
  SelectSignerType = 'selectSignerType',
  WalletLinkSessionRequest = 'WalletLinkSessionRequest',
  WalletLinkUpdate = 'WalletLinkUpdate',
}

type EventScopes = {
  popup: PopupConfigEvent;
  signer: SignerConfigEvent;
};

interface ScopedConfigMessage<S extends keyof EventScopes> extends Message {
  scope: S;
  event: EventScopes[S];
  data?: unknown;
}

export type SignerType = 'scw' | 'walletlink' | 'extension';

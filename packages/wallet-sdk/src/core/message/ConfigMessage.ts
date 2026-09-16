import { Message, MessageID } from './Message.js';

export interface ConfigMessage extends Message {
  event: ConfigEvent;
}

export interface PopupSetupV2Message extends Message {
  event: 'PopupSetupV2';
  requestId: MessageID;
  data: Record<string, unknown>;
}

export type ConfigEvent = 'PopupLoadedV2' | 'PopupSetupV2' | 'PopupUnload';

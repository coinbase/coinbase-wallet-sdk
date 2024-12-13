import { Message } from './Message.js';

export interface ConfigMessage extends Message {
  event: ConfigEvent;
}

export type ConfigEvent = 'PopupLoaded' | 'PopupUnload' | 'selectSignerType';

export type SignerType = 'scw';

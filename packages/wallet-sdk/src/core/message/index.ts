import { UUID } from 'crypto';

export interface Message {
  type: 'config' | 'scw';
  id: UUID;
  version: string;
}

export interface ResponseMessage extends Message {
  requestId: UUID;
}

export function isResponseMessage(message: Message): message is ResponseMessage {
  return 'requestId' in message;
}

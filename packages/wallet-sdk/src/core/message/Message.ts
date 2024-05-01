import { UUID } from 'crypto';

export type MessageID = UUID;

export interface Message {
  id: MessageID;
  requestId?: MessageID;
}

export function createMessage<T extends Message>(params: Omit<T, 'id'>): T {
  return {
    ...params,
    id: crypto.randomUUID(),
  } as T;
}

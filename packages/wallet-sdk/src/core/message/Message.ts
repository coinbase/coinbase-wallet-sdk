import { UUID } from 'crypto';

export type MessageID = UUID;

export interface Message {
  id: MessageID;
  requestId?: MessageID;
}

export type MessageWithOptionalId<T extends Message> = Omit<T, 'id'> & Partial<Pick<T, 'id'>>;

export function createMessage<T extends Message>(params: MessageWithOptionalId<T>): T {
  return {
    ...params,
    id: params.id ?? crypto.randomUUID(),
  } as T;
}

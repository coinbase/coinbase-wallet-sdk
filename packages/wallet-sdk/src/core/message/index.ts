import { UUID } from 'crypto';

export interface Message {
  id: UUID;
  requestId?: UUID;
}

export type MessageWithOptionalId<T extends Message> = Omit<T, 'id'> & Partial<Pick<T, 'id'>>;

export function createMessage<T extends Message>(params: MessageWithOptionalId<T>): T {
  return {
    ...params,
    id: params.id ?? crypto.randomUUID(),
  } as T;
}

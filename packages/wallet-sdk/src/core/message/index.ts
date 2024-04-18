import { UUID } from 'crypto';

export interface Message {
  type: 'config' | 'rpc';
  id: UUID;
  requestId?: UUID;
}

export function createMessage<T extends Message>(params: Omit<T, 'id'>): T {
  return {
    id: crypto.randomUUID(),
    ...params,
  } as T;
}

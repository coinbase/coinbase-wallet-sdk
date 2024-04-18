import { UUID } from 'crypto';

export interface Message {
  type: 'config' | 'rpc';
  id: UUID;
  requestId?: UUID;
}

export function createMessage<T extends Message>(params: Omit<T, 'id'>): T {
  return {
    ...params,
    id: crypto.randomUUID(),
  } as T;
}

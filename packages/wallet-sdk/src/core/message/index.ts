import { UUID } from 'crypto';

export interface Message {
  type: 'config' | 'rpc';
  id: UUID;
  version: string;
}

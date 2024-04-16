import { UUID } from 'crypto';

export interface Message {
  type: 'config' | 'web3';
  id: UUID;
  version: string;
}

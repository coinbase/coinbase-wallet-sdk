import { UUID } from 'crypto';

export interface Message {
  type: 'config' | 'scw';
  id: UUID;
}

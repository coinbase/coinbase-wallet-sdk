import { UUID } from 'crypto';

import { Action } from './Action';

export type Request = {
  uuid: UUID;
  actions: Action[];
  timestamp: number;
};

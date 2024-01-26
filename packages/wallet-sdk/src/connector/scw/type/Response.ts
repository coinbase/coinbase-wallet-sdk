import { UUID } from 'crypto';

import { ActionResponse } from './ActionResponse';

export type Response = {
  uuid: UUID;
  timestamp: number;
  actionResponses: ActionResponse[];
};

import { UUID } from 'crypto';

import { Web3Response } from '../../walletlink/type/Web3Response';
import { SCWWeb3Method } from './SCWWeb3Request';

export type SCWWeb3Response = {
  uuid: UUID;
  timestamp: number;
  actionResponses: ActionResponse[];
};

export type ActionResponse<M extends SCWWeb3Method = SCWWeb3Method> = Extract<
  Web3Response,
  { method: M }
>;

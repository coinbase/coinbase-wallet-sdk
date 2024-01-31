import { UUID } from 'crypto';

import { Request } from '../connector/scw/protocol/type/Request';
import { Response } from '../connector/scw/protocol/type/Response';
import { Message } from './CrossDomainCommunicator';

interface SCWMessage extends Message {
  type: 'web3Request' | 'web3Response';
  content: unknown;
  timestamp: Date;
}

export interface SCWRequestMessage extends SCWMessage {
  type: 'web3Request';
  content: Request;
}

export interface SCWResponseMessage<T> extends SCWMessage {
  type: 'web3Response';
  content: Response<T>;
  requestId: UUID;
}

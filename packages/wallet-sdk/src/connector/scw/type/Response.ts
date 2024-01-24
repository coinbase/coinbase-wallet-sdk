import { UUID } from 'crypto';

import { AddressString } from ':wallet-sdk/src/core/type';
import { JSONRPCMethod } from ':wallet-sdk/src/provider/JSONRPC';

export type Response = {
  uuid: UUID;
  timestamp: number;
  actionResponses: ActionResponse[];
};

// add other result types here as needed
type ActionResponseResult = AddressString[];

export type ActionResponse = {
  method: JSONRPCMethod;
  result: ActionResponseResult;
};

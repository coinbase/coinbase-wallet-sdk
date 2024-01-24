import { UUID } from 'crypto';

import { JSONRPCMethod } from ':wallet-sdk/src/provider/JSONRPC';

export type Request = {
  uuid: UUID;
  actions: Action[];
  timestamp: number;
};

export type Action = {
  method: JSONRPCMethod;
  params: string; // json encoded params
};

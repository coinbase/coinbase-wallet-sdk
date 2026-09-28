import { RequestArguments } from './RequestArguments.js';

export type RPCRequest = {
  action: RequestArguments; // CAIP-25 or CAIP-27 JSON-RPC call
};

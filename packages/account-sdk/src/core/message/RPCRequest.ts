import { RequestArguments } from ':core/provider/interface.js';

export type RPCRequest = {
  action: RequestArguments; // CAIP-25 or CAIP-27 JSON-RPC call
};

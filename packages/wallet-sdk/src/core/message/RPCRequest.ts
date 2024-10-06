import { RequestArguments } from ':core/provider/interface.js';

export type RPCRequest = {
  action: RequestArguments; // JSON-RPC call
  chainId: number;
};

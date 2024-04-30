import { RequestArguments } from ':core/provider/interface';

export type RPCRequest = {
  action: RequestArguments; // JSON-RPC call
  chainId: number;
};

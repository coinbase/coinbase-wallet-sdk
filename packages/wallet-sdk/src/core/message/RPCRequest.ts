import { RequestArguments } from ':core/type/provider';

export type RPCRequest = {
  action: RequestArguments; // JSON-RPC call
  chainId: number;
};

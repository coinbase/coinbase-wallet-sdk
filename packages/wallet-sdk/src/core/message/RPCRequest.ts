import { Action } from './Action';

export type RPCRequest = {
  action: Action; // JSON-RPC call
  chainId: number;
};

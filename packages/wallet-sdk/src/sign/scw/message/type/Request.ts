import { Action } from './Action';

export type SCWRequest = {
  action: Action; // JSON-RPC call
  chainId: number;
};

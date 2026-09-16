import { SerializedEthereumRpcError } from '../error/utils.js';

export type RPCResponse = {
  result:
    | {
        value: unknown; // JSON-RPC result
      }
    | {
        error: SerializedEthereumRpcError;
      };
};

import { SerializedEthereumRpcError } from '../error/utils.js';

export type RPCResponseNativeCurrency = {
  name?: string;
  symbol?: string;
  decimal?: number;
};

export type RPCResponse = {
  result:
    | {
        value: unknown; // JSON-RPC result
      }
    | {
        error: SerializedEthereumRpcError;
      };
  data?: {
    // optional data
    chains?: { [key: number]: string };
    capabilities?: Record<`0x${string}`, Record<string, unknown>>;
    nativeCurrencies?: { [key: number]: RPCResponseNativeCurrency };
  };
};

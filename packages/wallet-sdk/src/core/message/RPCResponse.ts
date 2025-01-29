import { SerializedEthereumRpcError } from '../error/utils.js';

type NativeCurrency = {
  symbol: string;
  name: string;
  decimal: number;
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
    nativeCurrencies?: { [key: number]: NativeCurrency };
    capabilities?: Record<`0x${string}`, Record<string, unknown>>;
  };
};

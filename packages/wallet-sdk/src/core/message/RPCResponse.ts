import { SerializedEthereumRpcError } from ':core/error';

type ActionResult<T> =
  | {
      value: T;
    }
  | {
      error: SerializedEthereumRpcError;
    };

export type RPCResponse<T> = {
  result: ActionResult<T>; // JSON-RPC result
  data?: {
    // optional data
    chains?: { [key: number]: string };
    capabilities?: Record<`0x${string}`, Record<string, unknown>>;
  };
};

import { ActionResult } from './ActionResult';

export type RPCResponse<T> = {
  result: ActionResult<T>; // JSON-RPC result
  data?: {
    // optional data
    chains?: { [key: number]: string };
    capabilities?: Record<`0x${string}`, Record<string, unknown>>;
  };
};

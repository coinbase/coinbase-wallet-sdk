import { ActionResult } from './ActionResult';

export type SCWResponse<T> = {
  result: ActionResult<T>; // JSON-RPC result
  data?: {
    // optional data
    chains?: { [key: number]: string };
    backendUrl?: string;
    capabilities?: Record<`0x${string}`, Record<string, unknown>>;
  };
};

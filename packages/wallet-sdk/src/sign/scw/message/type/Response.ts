import { ActionResult } from './ActionResult';

export type SCWResponse<T> = {
  result: ActionResult<T>; // JSON-RPC result
  data?: {
    // optional data
    chains?: { [key: number]: string };
  };
};

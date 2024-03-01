import { SerializedEthereumRpcError } from ':core/error';

export type ActionResult<T> =
  | {
      value: T;
    }
  | {
      error: SerializedEthereumRpcError;
    };

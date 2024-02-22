import { SerializedEthereumRpcError } from '../../../../core/error/utils';

export type ActionResult<T> =
  | {
      value: T;
    }
  | {
      error: SerializedEthereumRpcError;
    };

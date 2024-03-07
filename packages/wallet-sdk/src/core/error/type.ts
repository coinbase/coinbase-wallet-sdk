/**
 * Serializes the given error to an Ethereum JSON RPC-compatible error object.
 * Merely copies the given error's values if it is already compatible.
 * If the given error is not fully compatible, it will be preserved on the
 * returned object's data.originalError property.
 */
export interface SerializedEthereumRpcError {
  code: number; // must be an integer
  message: string;
  data?: unknown;
  stack?: string;
}

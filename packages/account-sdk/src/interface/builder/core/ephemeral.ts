import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { type StoreInstance, createStoreInstance } from ':store/store.js';

/**
 * Isolated in-memory store for `pay()`. Does not share Session or ECDH keys
 * with `createBaseAccountSDK`.
 */
export function createEphemeralStore(): StoreInstance {
  return createStoreInstance({ persist: false });
}

/** Methods `pay()` may call. Pairing is excluded so this instance cannot write a Session. */
const EPHEMERAL_METHODS = new Set([
  'wallet_sendCalls',
  'wallet_sign',
  'wallet_getCallsStatus',
  'eth_accounts',
  'net_version',
  'eth_chainId',
]);

/**
 * Reject pairing and anything else `pay()` does not need.
 * `wallet_sendCalls` / `wallet_sign` still go through disconnected handshake → send → cleanup.
 */
export function assertEphemeralMethod(method: RequestArguments['method']): void {
  if (EPHEMERAL_METHODS.has(method)) return;
  throw standardErrors.provider.unauthorized(
    `Method '${method}' is not supported by ephemeral provider. Ephemeral providers only support: wallet_sendCalls, wallet_sign, wallet_getCallsStatus`
  );
}

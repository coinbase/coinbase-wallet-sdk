import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { type StoreInstance, createStoreInstance } from ':store/store.js';

/**
 * Isolated in-memory store for `pay()`. Does not share Session or ECDH keys
 * with `createCoinbaseWalletSDK`.
 */
export function createEphemeralStore(): StoreInstance {
  return createStoreInstance({ persist: false });
}

/** Public methods `pay()` may call. Wallet-bound methods use the disconnected one-shot path. */
const EPHEMERAL_METHODS = new Set([
  'wallet_sendCalls',
  'wallet_sign',
  'experimental_requestInfo',
  'wallet_getCallsStatus',
  'eth_accounts',
  'net_version',
  'eth_chainId',
]);

/**
 * Reject public account connection and anything else `pay()` does not need.
 * Wallet-bound methods handshake, invoke once without a session, then clean up.
 */
export function assertEphemeralMethod(method: RequestArguments['method']): void {
  if (EPHEMERAL_METHODS.has(method)) return;
  throw standardErrors.provider.unauthorized(
    `Method '${method}' is not supported by ephemeral provider. Ephemeral providers only support: wallet_sendCalls, wallet_sign, experimental_requestInfo, wallet_getCallsStatus`
  );
}

import { standardErrors } from ':core/error/errors.js';
import { EPHEMERAL_METHODS } from ':core/namespaces/eip155/index.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { type StoreInstance, createStoreInstance } from ':store/store.js';

/**
 * Isolated in-memory store for `pay()`. Does not share Session or ECDH keys
 * with `createCoinbaseWalletSDK`.
 */
export function createEphemeralStore(): StoreInstance {
  return createStoreInstance({ persist: false });
}

/**
 * Reject public account connection and anything else that would create a session.
 *
 * `pay()` may call exactly what the disconnected router serves without pairing, so the
 * allowlist is that router's own set rather than a copy of it. Adding a method here that
 * the router does not know would silently fall through to `createSession`, which is the
 * one thing a one-shot provider must never do.
 */
export function assertEphemeralMethod(method: RequestArguments['method']): void {
  if (EPHEMERAL_METHODS.has(method)) return;
  throw standardErrors.provider.unauthorized(
    `Method '${method}' is not supported by ephemeral provider. Ephemeral providers only support: ${[...EPHEMERAL_METHODS].join(', ')}`
  );
}

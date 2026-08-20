import type { KeyManager } from ':core/transport/crypto/index.js';
import type { Communicator } from ':core/transport/popup/Communicator.js';
import type { Store } from ':store/store.js';

/**
 * Popup delivery bundle: postMessage communicator plus the shared ECDH `KeyManager`.
 * Handshake/send take this as `wire`. WalletLink 2.0 reuses `keys` with a relay
 * instead of `communicator`.
 */
export type PopupWire = {
  communicator: Pick<Communicator, 'postRequestAndWaitForResponse' | 'waitForPopupLoaded'>;
  keys: KeyManager;
  store: Store;
  chainId: () => number;
};

import type { KeyManager } from ':core/transport/crypto/index.js';
import type { Communicator } from ':core/transport/popup/Communicator.js';

/**
 * Popup delivery bundle: postMessage communicator plus the shared ECDH `KeyManager`.
 * Handshake/send take this as `wire`.
 */
export type PopupWire = {
  communicator: Pick<Communicator, 'postRequestAndWaitForResponse' | 'waitForPopupLoaded'>;
  keys: KeyManager;
};

/**
 * Popup transport: keys.coinbase.com via `window.postMessage`.
 *
 * `createPopup` returns a `WalletRuntime`. Handshake/send encrypt with
 * `core/transport/crypto`, then `Communicator` delivers. WalletLink 2.0 should
 * reuse crypto and return the same runtime type.
 */
export { Communicator } from './Communicator.js';
export { handshake } from './handshake.js';
export { createPopup } from './runtime.js';
export { send } from './send.js';
export type { PopupWire } from './types.js';

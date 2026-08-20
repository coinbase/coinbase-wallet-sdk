/**
 * EIP-1193 interface (diagram: EIP-1193 Interface + Handling).
 *
 * `request.ts` is `provider.request`. Sub-account is a fork in
 * `core/sub-account/` (local owner-key; funding / add-owner still `invoke`).
 * Does not own keys or the popup. `BaseAccountProvider` is a thin
 * EventEmitter over `handleEip1193Request`.
 */
export { handleEip1193Request } from './request.js';
export { handleConnected } from './connected.js';
export { handleDisconnected } from './disconnected.js';

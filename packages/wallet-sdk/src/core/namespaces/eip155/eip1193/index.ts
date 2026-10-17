/**
 * EIP-1193 interface (diagram: EIP-1193 Interface + Handling).
 *
 * `request.ts` is `provider.request`. Sub-account is a local fork here
 * Does not own keys or the popup. `CoinbaseWalletProvider` is a thin
 * EventEmitter over `handleEip1193Request`.
 */
export { handleEip1193Request } from './request.js';
export { handleConnected } from './connected.js';
export { EPHEMERAL_METHODS, handleDisconnected } from './disconnected.js';
export { connectEip155 } from './connect.js';
export { parseCaip27 } from './parseCaip27.js';
export { ALL_CHAINS_KEY, getCapabilities, projectCapabilities } from './capabilities.js';
export type { Eip1193Context } from './context.js';

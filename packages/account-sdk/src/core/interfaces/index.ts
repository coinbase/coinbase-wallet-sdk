/**
 * Dapp-facing interfaces (diagram: Interface + Handling).
 *
 * Each folder is one entry API into the same session kernel.
 * `eip1193/` is live. `solana/` is the sibling slot (Wallet Standard later).
 */
export { handleEip1193Request } from './eip1193/index.js';

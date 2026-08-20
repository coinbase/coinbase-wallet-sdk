/**
 * Wallet transports.
 *
 * `Session.transportKind` is `'popup' | 'walletlink2' | 'injected'`.
 *
 * Shared by every encrypted transport:
 * - `WalletRuntime` — what EIP-1193 handlers / pair / sub-account talk to
 * - `crypto/` — KeyManager (keys + secret) and `encrypt` / `decrypt` (seal)
 *
 * Per kind: `popup/` today (`createPopup` → keys.coinbase.com). `walletlink2/`
 * is the sibling slot (relay → Coinbase Wallet app). Crypto is nested here,
 * not a pair-only sidecar. Do not put ECDH or encrypt inside `popup/`.
 */
export type { WalletRuntime } from './types.js';
export { decrypt, encrypt, KeyManager } from './crypto/index.js';
export { Communicator, createPopup, handshake, send } from './popup/index.js';

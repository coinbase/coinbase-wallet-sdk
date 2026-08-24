/**
 * Transport crypto: ECDH keys and AES-GCM seal.
 *
 * `KeyManager` owns the keypair and shared secret (store-backed).
 * `encrypt` / `decrypt` use that secret — they are not methods on the manager.
 *
 * Popup and WalletLink 2.0 both call these, then deliver ciphertext themselves.
 * Distinct from `:owner-key` (WebCrypto owner keys for sub-account UserOps).
 */
export { decrypt } from './decrypt.js';
export { encrypt } from './encrypt.js';
export { KeyManager } from './KeyManager.js';

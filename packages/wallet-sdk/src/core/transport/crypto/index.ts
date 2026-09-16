/**
 * Transport crypto: ECDH keys and AES-GCM seal.
 *
 * `KeyManager` owns the keypair and shared secret (store-backed).
 * `encrypt` / `decrypt` use that secret — they are not methods on the manager.
 *
 * Popup delivery calls these around its postMessage transport. Distinct from
 */
export { decrypt } from './decrypt.js';
export { encrypt } from './encrypt.js';
export { KeyManager } from './KeyManager.js';

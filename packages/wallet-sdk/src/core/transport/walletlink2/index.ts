/**
 * WalletLink 2.0 transport (diagram: WalletLink 2.0 → Coinbase Wallet app).
 *
 * Sibling of `transport/popup`. Same `WalletTransport` shape and same
 * `transport/crypto` (KeyManager + encrypt/decrypt). Relay I/O instead of
 * `postMessage`. Does not talk to keys.coinbase.com.
 */
export {};

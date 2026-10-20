import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { registerWallet } from '@wallet-standard/wallet';
import { isCoinbaseWalletHost } from '../isCoinbaseWalletHost.js';
import { createSolanaWallet } from './createSolanaWallet.js';

let popupWalletRegistered = false;

/**
 * Advertise the popup wallet once per page.
 *
 * Skipped without a browser (server rendering) and when a Coinbase Wallet host registers its
 * own. Wallet Standard cannot unregister a wallet, so the first SDK instance's transport is
 * the one the page keeps.
 */
export function registerSolanaWallet({
  transport,
  session,
}: { transport: WalletTransport; session: Store['session'] }): void {
  if (typeof window === 'undefined' || isCoinbaseWalletHost() || popupWalletRegistered) return;

  const wallet = createSolanaWallet(transport, session);
  popupWalletRegistered = true;
  registerWallet(wallet);
}

/** @internal Test-only reset for module-scoped wallet registration. */
export function _resetSolanaWalletRegistration(): void {
  popupWalletRegistered = false;
}

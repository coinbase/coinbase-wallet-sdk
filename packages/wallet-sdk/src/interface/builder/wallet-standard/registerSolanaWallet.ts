import { standardErrors } from ':core/error/errors.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { registerWallet } from '@wallet-standard/wallet';
import { isCoinbaseWalletHost } from '../isCoinbaseWalletHost.js';
import { createSolanaWallet } from './createSolanaWallet.js';

let popupWalletRegistered = false;

/**
 * Explicitly advertise the popup wallet when a Coinbase Wallet host does not provide one.
 */
export function registerSolanaWallet({
  transport,
  session,
}: { transport: WalletTransport; session: Store['session'] }): void {
  if (typeof window === 'undefined') {
    throw standardErrors.provider.disconnected('Solana wallet registration requires a browser');
  }

  if (isCoinbaseWalletHost() || popupWalletRegistered) return;

  const wallet = createSolanaWallet(transport, session);
  popupWalletRegistered = true;
  registerWallet(wallet);
}

/** @internal Test-only reset for module-scoped wallet registration. */
export function _resetSolanaWalletRegistration(): void {
  popupWalletRegistered = false;
}

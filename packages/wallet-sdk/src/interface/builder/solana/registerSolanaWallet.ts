import { standardErrors } from ':core/error/errors.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { registerWallet } from '@wallet-standard/wallet';
import { isCoinbaseWalletHost } from '../isCoinbaseWalletHost.js';
import { createSolanaWallet } from './createSolanaWallet.js';

let popupWalletRegistered = false;
let activeTransport: WalletTransport | undefined;
let activeSession: Store['session'] | undefined;

function currentTransport(): WalletTransport {
  if (!activeTransport) {
    throw standardErrors.provider.disconnected('Solana wallet transport is unavailable');
  }
  return activeTransport;
}

function currentSession(): Store['session'] {
  if (!activeSession) {
    throw standardErrors.provider.disconnected('Solana wallet session is unavailable');
  }
  return activeSession;
}

const registeredWalletTransport: WalletTransport = {
  handshake: (args) => currentTransport().handshake(args),
  request: (request) => currentTransport().request(request),
  readSession: () => currentTransport().readSession(),
  writeSession: (session) => currentTransport().writeSession(session),
  cleanup: () => currentTransport().cleanup(),
};

const registeredWalletSession: Store['session'] = {
  get: () => currentSession().get(),
  set: (session) => currentSession().set(session),
  clear: () => currentSession().clear(),
  subscribe: (listener) => currentSession().subscribe(listener),
};

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
  if (isCoinbaseWalletHost()) return;

  activeTransport = transport;
  activeSession = session;
  if (popupWalletRegistered) return;

  const wallet = createSolanaWallet(registeredWalletTransport, registeredWalletSession);
  popupWalletRegistered = true;
  registerWallet(wallet);
}

/** @internal Test-only reset for module-scoped wallet registration. */
export function _resetSolanaWalletRegistration(): void {
  popupWalletRegistered = false;
  activeTransport = undefined;
  activeSession = undefined;
}

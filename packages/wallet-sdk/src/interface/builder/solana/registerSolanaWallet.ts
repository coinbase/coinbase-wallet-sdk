import { standardErrors } from ':core/error/errors.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { registerWallet } from '@wallet-standard/wallet';
import { createSolanaWallet } from './createSolanaWallet.js';

const COINBASE_WALLET_IN_APP_BROWSER_PATTERN = /CoinbaseWalletRN\//;
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

type CoinbaseWalletWindow = Window & {
  coinbaseWallet?: {
    environment?: 'inAppBrowser' | 'extension';
  };
};

function browserWindow(): CoinbaseWalletWindow | undefined {
  return typeof window === 'undefined' ? undefined : (window as CoinbaseWalletWindow);
}

/**
 * True when the page is hosted by Coinbase Wallet and owns Wallet Standard registration.
 *
 * `window.coinbaseWallet.environment` is the primary, extensible document-start contract shared
 * with the InAppBrowser and extension. The immutable `CoinbaseWalletRN/` user-agent token keeps
 * older InAppBrowser versions compatible when they predate the environment field. These signals
 * only prevent a duplicate popup wallet; they are routing hints and must not be used for trust.
 */
function hostOwnsSolanaWalletRegistration(current: CoinbaseWalletWindow): boolean {
  const environment = current.coinbaseWallet?.environment;
  return (
    environment === 'inAppBrowser' ||
    environment === 'extension' ||
    (typeof navigator !== 'undefined' &&
      COINBASE_WALLET_IN_APP_BROWSER_PATTERN.test(navigator.userAgent))
  );
}

/**
 * Explicitly advertise the popup wallet when a Coinbase Wallet host does not provide one.
 */
export function registerSolanaWallet({
  transport,
  session,
}: { transport: WalletTransport; session: Store['session'] }): void {
  const current = browserWindow();
  if (!current) {
    throw standardErrors.provider.disconnected('Solana wallet registration requires a browser');
  }
  if (hostOwnsSolanaWalletRegistration(current)) return;

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

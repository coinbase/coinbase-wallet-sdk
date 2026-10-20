import { getInjectedProvider } from './eip1193/getInjectedProvider.js';

const COINBASE_WALLET_IN_APP_BROWSER_PATTERN = /CoinbaseWalletRN\//;

type CoinbaseWalletHostWindow = Window & {
  coinbaseWallet?: {
    environment?: 'inAppBrowser' | 'extension';
  };
};

/**
 * True when Coinbase Wallet hosts the page and owns injected wallet registration.
 *
 * Older in-app browser builds inject the `isCoinbaseBrowser` provider without sending the
 * `CoinbaseWalletRN` user agent, so that provider counts as a signal on its own.
 *
 * These signals are routing hints only and must not be used as a trust boundary.
 */
export function isCoinbaseWalletHost(): boolean {
  if (typeof window === 'undefined') return false;
  if (getInjectedProvider()) return true;

  const environment = (window as CoinbaseWalletHostWindow).coinbaseWallet?.environment;

  return (
    environment === 'inAppBrowser' ||
    environment === 'extension' ||
    (typeof navigator !== 'undefined' &&
      COINBASE_WALLET_IN_APP_BROWSER_PATTERN.test(navigator.userAgent))
  );
}

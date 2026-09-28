const COINBASE_WALLET_IN_APP_BROWSER_PATTERN = /CoinbaseWalletRN\//;

type CoinbaseWalletHostWindow = Window & {
  coinbaseWallet?: {
    environment?: 'inAppBrowser' | 'extension';
  };
};

/**
 * True when Coinbase Wallet hosts the page and owns injected wallet registration.
 *
 * These signals are routing hints only and must not be used as a trust boundary.
 */
export function isCoinbaseWalletHost(): boolean {
  if (typeof window === 'undefined') return false;
  const environment = (window as CoinbaseWalletHostWindow).coinbaseWallet?.environment;
  return (
    environment === 'inAppBrowser' ||
    environment === 'extension' ||
    (typeof navigator !== 'undefined' &&
      COINBASE_WALLET_IN_APP_BROWSER_PATTERN.test(navigator.userAgent))
  );
}

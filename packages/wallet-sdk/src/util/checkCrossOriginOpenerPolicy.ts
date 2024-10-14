const COOP_ERROR_MESSAGE = `Coinbase Wallet SDK requires the Cross-Origin-Opener-Policy header to not be set to 'same-origin'. This is to ensure that the SDK can communicate with the Coinbase Smart Wallet app.

Please see https://www.smartwallet.dev/guides/tips/popup-tips#cross-origin-opener-policy for more information.`;

/**
 * Checks the compatibility of the Cross-Origin-Opener-Policy (COOP) for the current window.
 *
 * This function fetches the current origin and examines the 'Cross-Origin-Opener-Policy' header.
 * If the policy is set to 'same-origin', it logs an error message and returns `false`.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the COOP is compatible or if the code is running in a non-browser environment, and `false` otherwise.
 */
export async function checkCrossOriginOpenerPolicy(): Promise<string> {
  if (typeof window === 'undefined') {
    // Non-browser environment
    return 'non-browser-env';
  }

  const response = await fetch(window.location.origin, {});
  const crossOriginOpenerPolicy = response.headers.get('Cross-Origin-Opener-Policy');

  if (crossOriginOpenerPolicy === 'same-origin') {
    console.error(COOP_ERROR_MESSAGE);
  }

  return crossOriginOpenerPolicy ?? 'null';
}

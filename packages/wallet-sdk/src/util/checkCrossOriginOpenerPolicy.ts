const COOP_ERROR_MESSAGE = `Coinbase Wallet SDK requires the Cross-Origin-Opener-Policy header to not be set to 'same-origin'. This is to ensure that the SDK can communicate with the Coinbase Smart Wallet app.

Please see https://www.smartwallet.dev/guides/tips/popup-tips#cross-origin-opener-policy for more information.`;

/**
 * Creates a checker for the Cross-Origin-Opener-Policy (COOP).
 *
 * @returns An object with methods to get and check the Cross-Origin-Opener-Policy.
 *
 * @method getCrossOriginOpenerPolicy
 * Retrieves current Cross-Origin-Opener-Policy.
 * @throws Will throw an error if the policy has not been checked yet.
 *
 * @method checkCrossOriginOpenerPolicy
 * Checks the Cross-Origin-Opener-Policy of the current environment.
 * If in a non-browser environment, sets the policy to 'non-browser-env'.
 * If in a browser environment, fetches the policy from the current origin.
 * Logs an error if the policy is 'same-origin'.
 */
const createCoopChecker = () => {
  let crossOriginOpenerPolicy: string | undefined;

  return {
    getCrossOriginOpenerPolicy: () => {
      if (crossOriginOpenerPolicy === undefined) {
        return 'undefined';
      }

      return crossOriginOpenerPolicy;
    },
    checkCrossOriginOpenerPolicy: async () => {
      if (typeof window === 'undefined') {
        // Non-browser environment
        crossOriginOpenerPolicy = 'non-browser-env';
        return;
      }

      try {
        const url = `${window.location.origin}${window.location.pathname}`;
        const response = await fetch(url, {
          method: 'HEAD',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = response.headers.get('Cross-Origin-Opener-Policy');
        crossOriginOpenerPolicy = result ?? 'null';

        if (crossOriginOpenerPolicy === 'same-origin') {
          console.error(COOP_ERROR_MESSAGE);
        }
      } catch (error) {
        console.error('Error checking Cross-Origin-Opener-Policy:', (error as Error).message);
        crossOriginOpenerPolicy = 'error';
      }
    },
  };
};

export const { checkCrossOriginOpenerPolicy, getCrossOriginOpenerPolicy } = createCoopChecker();

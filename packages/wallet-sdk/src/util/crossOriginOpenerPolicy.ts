export function checkCrossOriginOpenerPolicy() {
  if (typeof window === 'undefined') {
    return;
  }

  fetch(window.location.origin, {}).then((response) => {
    const headers = response.headers;
    const crossOriginOpenerPolicy = headers.get('Cross-Origin-Opener-Policy');
    if (crossOriginOpenerPolicy === 'same-origin') {
      console.error(`Coinbase Wallet SDK requires the Cross-Origin-Opener-Policy header to not be set to 'same-origin'. This is to ensure that the SDK can communicate with the Coinbase Smart Wallet app.

Please see https://www.smartwallet.dev/guides/tips/popup-tips#cross-origin-opener-policy for more information.`);
    }
  });
}

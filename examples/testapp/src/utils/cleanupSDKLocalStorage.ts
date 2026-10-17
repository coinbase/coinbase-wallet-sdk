export const cleanupSDKLocalStorage = () => {
  // remove all keys that contains 'coinbase-wallet-sdk', as well as legacy keys
  Object.keys(localStorage).forEach((key) => {
    if (
      key.startsWith('cbwsdk.') ||
      key.startsWith('-CBWSDK:') ||
      key.startsWith('coinbase-wallet-sdk')
    ) {
      localStorage.removeItem(key);
    }
  });
};

export const cleanupSDKLocalStorage = () => {
  // remove all keys that contains 'cbw' or 'CBW'
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('cbwsdk.') || key.startsWith('-CBWSDK:')) {
      localStorage.removeItem(key);
    }
  });
};

export type BaseStorage = {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  getAllKeys: () => string[];
};

/**
 * An adapter that transforms a web {@link Storage} object into a {@link BaseStorage}
 *
 * @example
 * let storage = browserStorageAdapter(window.localStorage);
 * let sdk = new CoinbaseWalletSDK({
 *   storage,
 *   // ...options
 * });
 *
 * @param storage A web {@link Storage} object like {@link localStorage}
 * @returns A {@link BaseStorage} object that wraps the passed in storage
 */
export function browserStorageAdapter(storage: Storage): BaseStorage {
  return {
    get: (key) => storage.getItem(key),
    set: (key, value) => storage.setItem(key, value),
    delete: (key) => storage.removeItem(key),
    getAllKeys: () => {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          keys.push(key);
        }
      }
      return keys;
    },
  };
}

type MMKVStorage = {
  getString: (key: string) => string | null;
  set: <T>(key: string, value: T) => void;
  delete: (key: string) => void;
  getAllKeys: () => string[];
};

/**
 * An adapter that transforms a React Native MMKV storage object into a {@link BaseStorage}
 *
 * @example
 * let mmkv = new MMKV();
 * let storage = mmkvStorageAdapter(mmkv);
 * let sdk = new CoinbaseWalletSDK({
 *   storage,
 *   // ...options
 * });
 *
 * @param storage A React Native MMKV storage object
 * @returns A {@link BaseStorage} object that wraps the passed in storage
 */
export function mmkvStorageAdapter(storage: MMKVStorage): BaseStorage {
  return {
    get: (key) => storage.getString(key),
    set: (key, value) => storage.set(key, value),
    delete: (key) => storage.delete(key),
    getAllKeys: () => storage.getAllKeys(),
  };
}

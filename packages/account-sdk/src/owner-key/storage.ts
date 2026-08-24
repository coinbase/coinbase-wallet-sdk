import { createStore, del, get, set } from 'idb-keyval';

export type AsyncStorage = {
  getItem: <T>(key: string) => Promise<T | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: unknown) => Promise<void>;
};

export function createStorage(scope: string, name: string): AsyncStorage {
  const store = typeof indexedDB !== 'undefined' ? createStore(scope, name) : undefined;
  return {
    getItem: async (key: string) => {
      const value = await get(key, store);
      if (!value) {
        return null;
      }
      return value;
    },
    removeItem: async (key: string) => {
      return del(key, store);
    },
    setItem: async (key: string, value: unknown) => {
      return set(key, value, store);
    },
  };
}

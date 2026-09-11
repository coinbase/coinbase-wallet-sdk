import { createStore, del, get, set } from 'idb-keyval';

export type IdbStorage = {
  getItem: <T>(key: string) => Promise<T | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: unknown) => Promise<void>;
};

export function createIdbStorage(scope: string, name: string): IdbStorage {
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

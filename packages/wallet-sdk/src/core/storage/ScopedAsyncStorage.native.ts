import AsyncStorage from '@react-native-async-storage/async-storage';

import { KeyValueStorage, Scope, ScopedStorage } from './types';

export class ScopedAsyncStorage extends ScopedStorage implements KeyValueStorage {
  constructor(scope: Scope, module?: string) {
    super(scope, module);
  }

  async storeObject<T>(key: string, item: T): Promise<void> {
    await this.setItem(key, JSON.stringify(item));
  }

  async loadObject<T>(key: string): Promise<T | undefined> {
    const item = await this.getItem(key);
    return item ? JSON.parse(item) : undefined;
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(this.scopedKey(key), value);
  }

  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(this.scopedKey(key));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(this.scopedKey(key));
  }

  async clear(): Promise<void> {
    const prefix = this.scopedKey('');
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter((key) => typeof key === 'string' && key.startsWith(prefix));
    await AsyncStorage.multiRemove(keysToRemove);
  }
}

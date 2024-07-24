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

  setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(this.scopedKey(key), value);
    return Promise.resolve();
  }

  getItem(key: string): Promise<string | null> {
    return Promise.resolve(localStorage.getItem(this.scopedKey(key)));
  }

  removeItem(key: string): Promise<void> {
    localStorage.removeItem(this.scopedKey(key));
    return Promise.resolve();
  }

  clear(): Promise<void> {
    const prefix = this.scopedKey('');
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (typeof key === 'string' && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    return Promise.resolve();
  }
}

// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

import { BaseStorage, browserStorageAdapter } from './BaseStorage';

// TODO: clean up, or possibly deprecate Storage class
export class ScopedStorage {
  private baseStorage: BaseStorage;

  constructor(
    private scope: 'CBWSDK' | 'walletlink',
    private module?: string,
    baseStorage?: BaseStorage
  ) {
    if (baseStorage) {
      this.baseStorage = baseStorage;
    } else {
      if (!window.localStorage) {
        throw new Error('ScopedLocalStorage: baseStorage is required in non-browser contexts');
      }

      this.baseStorage = browserStorageAdapter(window.localStorage);
    }
  }

  storeObject<T>(key: string, item: T) {
    this.baseStorage.set(key, JSON.stringify(item));
  }

  loadObject<T>(key: string): T | undefined {
    const item = this.baseStorage.get(key);
    return item ? JSON.parse(item) : undefined;
  }

  public setItem(key: string, value: string): void {
    this.baseStorage.set(this.scopedKey(key), value);
  }

  public getItem(key: string): string | null {
    return this.baseStorage.get(this.scopedKey(key));
  }

  public removeItem(key: string): void {
    this.baseStorage.delete(this.scopedKey(key));
  }

  public clear(): void {
    const prefix = this.scopedKey('');
    for (const key of this.baseStorage.getAllKeys()) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        this.baseStorage.delete(key);
      }
    }
  }

  scopedKey(key: string): string {
    return `-${this.scope}${this.module ? `:${this.module}` : ''}:${key}`;
  }

  static clearAll(baseStorage: BaseStorage | undefined) {
    new ScopedStorage('CBWSDK', undefined, baseStorage).clear();
    new ScopedStorage('walletlink', undefined, baseStorage).clear();
  }
}

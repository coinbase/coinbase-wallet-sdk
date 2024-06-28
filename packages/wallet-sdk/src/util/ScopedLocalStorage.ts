// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

// TODO: clean up, or possibly deprecate Storage class
export class ScopedLocalStorage {
  constructor(
    private scope: 'CBWSDK' | 'walletlink',
    private module?: string
  ) {}

  storeObject<T>(key: string, item: T) {
    this.setItem(key, JSON.stringify(item));
  }

  loadObject<T>(key: string): T | undefined {
    const item = this.getItem(key);
    return item ? JSON.parse(item) : undefined;
  }

  public setItem(key: string, value: string): void {
    localStorage.setItem(this.scopedKey(key), value);
  }

  public getItem(key: string): string | null {
    return localStorage.getItem(this.scopedKey(key));
  }

  public removeItem(key: string): void {
    localStorage.removeItem(this.scopedKey(key));
  }

  public clear(): void {
    const prefix = this.scopedKey('');
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (typeof key === 'string' && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  scopedKey(key: string): string {
    return `-${this.scope}${this.module ? `:${this.module}` : ''}:${key}`;
  }

  static clearAll() {
    new ScopedLocalStorage('CBWSDK').clear();
    new ScopedLocalStorage('walletlink').clear();
  }
}

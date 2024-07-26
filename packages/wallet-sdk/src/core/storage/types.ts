export interface KeyValueStorage {
  storeObject<T>(key: string, item: T): Promise<void>;
  loadObject<T>(key: string): Promise<T | undefined>;

  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export type Scope = 'CBWSDK' | 'walletlink';

export abstract class ScopedStorage {
  constructor(
    private scope: Scope,
    private module: string | undefined
  ) {}

  scopedKey(key: string) {
    return `-${this.scope}${this.module ? `:${this.module}` : ''}:${key}`;
  }
}

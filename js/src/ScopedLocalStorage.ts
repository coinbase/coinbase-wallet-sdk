// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

export class ScopedLocalStorage {
  constructor(private scope: string) {}

  public setItem(key: string, value: string): void {
    localStorage.setItem(this.scopedKey(key), value)
  }

  public getItem(key: string): string | null {
    return localStorage.getItem(this.scopedKey(key))
  }

  public removeItem(key: string): void {
    localStorage.removeItem(this.scopedKey(key))
  }

  public clear(): void {
    const prefix = this.scopedKey("")
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (typeof key === "string" && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  private scopedKey(key: string): string {
    return `${this.scope}:${key}`
  }
}

// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

const KEY_PREFIX = "_WalletLink_"

function prefixedKey(key: string): string {
  return `${KEY_PREFIX}:${key}`
}

export function setItem(key: string, value: string): void {
  localStorage.setItem(prefixedKey(key), value)
}

export function getItem(key: string): string | null {
  return localStorage.getItem(prefixedKey(key))
}

export function removeItem(key: string): void {
  localStorage.removeItem(prefixedKey(key))
}

export function clear(): void {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (typeof key === "string" && key.startsWith(KEY_PREFIX)) {
      localStorage.removeItem(key)
    }
  }
}

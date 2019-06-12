// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

const LOCALSTORAGE_KEY_PREFIX = "WalletLink:"

function key(name: string): string {
  return `${LOCALSTORAGE_KEY_PREFIX}${name}`
}

export function setItem(name: string, value: any): void {
  localStorage.setItem(key(name), JSON.stringify(value))
}

export function getItem<T = any>(name: string): T | null {
  const val = localStorage.getItem(key(name))
  if (typeof val !== "string") {
    return null
  }
  try {
    return JSON.parse(val)
  } catch (_err) {
    return null
  }
}

export function removeItem(name: string): void {
  localStorage.removeItem(key(name))
}

export function clear(): void {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (typeof k === "string" && k.startsWith(LOCALSTORAGE_KEY_PREFIX)) {
      localStorage.removeItem(k)
    }
  }
}

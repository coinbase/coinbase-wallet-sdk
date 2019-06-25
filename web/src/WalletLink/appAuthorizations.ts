// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

const LOCALSTORAGE_KEY_PREFIX = "AppAuth:"

function localStorageKey(origin: string): string {
  return LOCALSTORAGE_KEY_PREFIX + origin
}

export function setOriginAuthorized(origin: string): void {
  if (!origin) {
    return
  }
  localStorage.setItem(localStorageKey(origin), "1")
}

export function isOriginAuthorized(origin: string): boolean {
  return localStorage.getItem(localStorageKey(origin)) === "1"
}

export function clearAllAuthorizations(): void {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (typeof k === "string" && k.startsWith(LOCALSTORAGE_KEY_PREFIX)) {
      localStorage.removeItem(k)
    }
  }
}

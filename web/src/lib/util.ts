// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

export function nextTick(fn: () => void): void {
  const { setImmediate } = window as any
  if (typeof setImmediate === "function") {
    setImmediate(fn)
    return
  }
  window.setTimeout(fn, 0)
}

export function isLocalStorageBlocked(): boolean {
  try {
    localStorage.getItem("test")
  } catch (err) {
    return true
  }
  return false
}

export function postMessageToParent(message: any, origin: string = "*"): void {
  if (window.opener) {
    window.opener.postMessage(message, origin)
    return
  }
  if (window.parent !== window) {
    window.parent.postMessage(message, origin)
  }
}

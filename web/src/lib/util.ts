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

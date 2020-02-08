// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

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

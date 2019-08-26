// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

export const NODE_ENV = process.env.NODE_ENV || "development"
export const WEB_URL = getWebUrl()
export const SERVER_URL = getServerUrl()

function getWebUrl(): string {
  if (NODE_ENV === "development") {
    return process.env.REACT_APP_WEB_URL || "http://localhost:3001"
  }
  const { protocol, host } = document.location
  return `${protocol}//${host}`
}

function getServerUrl(): string {
  if (NODE_ENV === "development") {
    return process.env.REACT_APP_SERVER_URL || "http://localhost:8080"
  }
  return getWebUrl()
}

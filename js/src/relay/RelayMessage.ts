// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

export enum RelayMessageType {
  SESSION_ID_REQUEST = "SESSION_ID_REQUEST",
  SESSION_ID_RESPONSE = "SESSION_ID_RESPONSE",
  LINKED = "LINKED",
  UNLINKED = "UNLINKED",
  WEB3_REQUEST = "WEB3_REQUEST",
  WEB3_REQUEST_CANCELED = "WEB3_REQUEST_CANCELED",
  WEB3_RESPONSE = "WEB3_RESPONSE"
}

export interface RelayMessage<T extends RelayMessageType = any> {
  type: T
}

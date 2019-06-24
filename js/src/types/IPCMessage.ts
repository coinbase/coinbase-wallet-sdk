// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

export enum IPCMessageType {
  LINKED = "LINKED",
  UNLINKED = "UNLINKED",
  WEB3_REQUEST = "WEB3_REQUEST",
  WEB3_RESPONSE = "WEB3_RESPONSE",
  WEB3_REVEAL_ADDRESSES = "WEB3_REVEAL_ADDRESSES",
  WEB3_DENY_ADDRESSES = "WEB3_DENY_ADDRESSES"
}

export interface IPCMessage<T extends IPCMessageType> {
  type: T
}

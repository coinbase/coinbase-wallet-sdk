// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

export enum IPCMessageType {
  LINKED = "LINKED",
  UNLINKED = "UNLINKED",
  WEB3_REQUEST = "WEB3_REQUEST",
  WEB3_RESPONSE = "WEB3_RESPONSE"
}

export interface IPCMessage<T extends IPCMessageType = any> {
  type: T
}

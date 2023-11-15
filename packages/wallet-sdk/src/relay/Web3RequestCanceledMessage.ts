// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { RelayMessage } from './RelayMessage';

export function Web3RequestCanceledMessage(id: string): RelayMessage {
  return { type: 'WEB3_REQUEST_CANCELED', id };
}

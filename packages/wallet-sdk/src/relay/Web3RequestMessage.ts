// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { RelayMessage } from './RelayMessage';
import { Web3Request } from './Web3Request';

export function Web3RequestMessage(params: { id: string; request: Web3Request }): RelayMessage {
  return { type: 'WEB3_REQUEST', ...params };
}

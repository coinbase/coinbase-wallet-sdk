// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { RelayMessage } from './RelayMessage';
import { Web3Response } from './Web3Response';

export function Web3ResponseMessage(params: { id: string; response: Web3Response }): RelayMessage {
  return { type: 'WEB3_RESPONSE', ...params };
}

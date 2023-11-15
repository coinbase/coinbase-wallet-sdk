// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { RelayMessage } from './RelayMessage';
import { Web3Response } from './Web3Response';

export interface Web3ResponseMessage<M extends Web3Method = Web3Method>
  extends RelayMessage<RelayMessageType.WEB3_RESPONSE> {
  type: RelayMessageType.WEB3_RESPONSE;
  id: string;
  response: Web3Response<M>;
}

export function Web3ResponseMessage<M extends Web3Method>(
  params: Omit<Web3ResponseMessage<M>, 'type'>
): Web3ResponseMessage<M> {
  return { type: RelayMessageType.WEB3_RESPONSE, ...params };
}

export function Web3ResponseMessage(params: { id: string; response: Web3Response }): RelayMessage {
  return { type: 'WEB3_RESPONSE', ...params };
}

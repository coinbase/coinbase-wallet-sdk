// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { Web3Request } from './Web3Request';
import { Web3Response } from './Web3Response';

export type RelayMessageType =
  | 'SESSION_ID_REQUEST'
  | 'SESSION_ID_RESPONSE'
  | 'LINKED'
  | 'UNLINKED'
  | 'WEB3_REQUEST'
  | 'WEB3_REQUEST_CANCELED'
  | 'WEB3_RESPONSE';

export type RelayMessage = {
  type: RelayMessageType;
  id: string;
} & (
  | {
      type: 'WEB3_REQUEST';
      request: Web3Request;
    }
  | {
      type: 'WEB3_REQUEST_CANCELED';
    }
  | {
      type: 'WEB3_RESPONSE';
      response: Web3Response;
    }
);

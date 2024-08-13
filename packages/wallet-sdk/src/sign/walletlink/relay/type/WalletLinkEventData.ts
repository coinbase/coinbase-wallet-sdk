// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { Web3Request } from './Web3Request';
import { Web3Response } from './Web3Response';

export type WalletLinkEventData = {
  id: string;
} & (
  | {
      type: 'WEB3_RESPONSE';
      response: Web3Response;
    }
  | {
      type: 'WEB3_REQUEST';
      request: Web3Request;
    }
  | {
      type: 'WEB3_REQUEST_CANCELED';
    }
);

// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { Web3Request } from './Web3Request.js';
import { Web3Response } from './Web3Response.js';

export type WalletLinkEventData =
  | {
      type: 'WEB3_RESPONSE';
      id: string;
      response: Web3Response;
    }
  | {
      type: 'WEB3_REQUEST';
      id: string;
      request: Web3Request;
    }
  | {
      type: 'WEB3_REQUEST_CANCELED';
      id: string;
    };

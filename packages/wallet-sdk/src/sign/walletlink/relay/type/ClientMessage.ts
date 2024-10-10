// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { IntNumber } from ':core/type/index.js';

export type ClientMessage =
  | {
      type: 'HostSession';
      id: IntNumber;
      sessionId: string;
      sessionKey: string;
    }
  | {
      type: 'IsLinked';
      id: IntNumber;
      sessionId: string;
    }
  | {
      type: 'GetSessionConfig';
      id: IntNumber;
      sessionId: string;
    }
  | {
      type: 'SetSessionConfig';
      id: IntNumber;
      sessionId: string;
      metadata: { [key: string]: string | null };
    }
  | {
      type: 'PublishEvent';
      id: IntNumber;
      sessionId: string;
      event: string;
      data: string; // encrypted WalletLinkEventData
      callWebhook: boolean;
    };

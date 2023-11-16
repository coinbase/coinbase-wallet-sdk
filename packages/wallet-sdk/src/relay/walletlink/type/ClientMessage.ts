// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IntNumber } from '../../../core/type';

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
      webhookId?: string | null;
      webhookUrl?: string | null;
      metadata?: { [key: string]: string | null };
    }
  | {
      type: 'PublishEvent';
      id: IntNumber;
      sessionId: string;
      event: string;
      data: string;
      callWebhook: boolean;
    };

// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IntNumber } from '../types';

type _ClientMessage =
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

type Type = _ClientMessage['type'];
export type ClientMessageType = Type;

export type ClientMessage<T extends Type = Type> = Extract<_ClientMessage, { type: T }>;

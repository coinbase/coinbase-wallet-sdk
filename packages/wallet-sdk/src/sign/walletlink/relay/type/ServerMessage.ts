// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { IntNumber } from ':core/type/index.js';

export type ServerMessage<T extends Type = Type> = Extract<_ServerMessage, { type: T }>;

export type ServerMessageType = Type;
type Type = _ServerMessage['type'];

type _ServerMessage =
  | {
      type: 'Heartbeat'; // TODO: remove. it's client side only virtual message.
    }
  | {
      type: 'OK';
      id: IntNumber;
      sessionId: string;
    }
  | {
      type: 'Fail';
      id: IntNumber;
      sessionId: string;
      error: string;
    }
  | {
      type: 'IsLinkedOK';
      id: IntNumber;
      sessionId: string;
      linked: boolean;
      onlineGuests: number;
    }
  | {
      type: 'Linked';
      id?: IntNumber;
      sessionId: string;
      onlineGuests: number;
    }
  | {
      type: 'GetSessionConfigOK';
      id: IntNumber;
      sessionId: string;
      webhookId: string;
      webhookUrl: string;
      metadata: { [field: string]: string };
    }
  | {
      type: 'SessionConfigUpdated';
      id?: IntNumber;
      sessionId: string;
      webhookId: string;
      webhookUrl: string;
      metadata: { [field: string]: string };
    }
  | {
      type: 'PublishEventOK';
      id: IntNumber;
      sessionId: string;
      eventId: string;
    }
  | {
      type: 'Event';
      id?: IntNumber;
      sessionId: string;
      eventId: string;
      event: string;
      data: string; // encrypted WalletLinkEventData
    };

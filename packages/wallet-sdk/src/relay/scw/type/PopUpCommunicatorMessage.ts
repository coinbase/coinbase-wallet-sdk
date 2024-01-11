import { UUID } from 'crypto';

export type MessageEnvelope = {
  id: UUID;
  content: unknown;
};

export type MessageEnvelopeResponse = MessageEnvelope & {
  content: {
    requestId: UUID;
    response: unknown;
  };
};

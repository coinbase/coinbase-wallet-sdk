import { MessageTypes, TypedDataV1, TypedMessage } from '@metamask/eth-sig-util';

type messageType = TypedDataV1 | TypedMessage<MessageTypes>;

export type ShortcutType = {
  key: string;
  data: Record<string, string | messageType | object>;
};

export const parseMessage = (message: string | messageType) => {
  if (typeof message === 'string') {
    return JSON.parse(message);
  }

  return message;
};

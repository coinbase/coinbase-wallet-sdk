import { MessageTypes, TypedDataV1, TypedMessage } from '@metamask/eth-sig-util';

import { compressJsonString } from '../utils/compressJsonString';

type messageType = TypedDataV1 | TypedMessage<MessageTypes>;

export type ShortcutType = {
  key: string;
  data: Record<string, string | messageType | object>;
};

export const parseMessage = (message: string | messageType) => {
  let parsedResult;
  if (typeof message === 'string') {
    const compressedMessage = compressJsonString(message);
    parsedResult = JSON.parse(compressedMessage);
  } else {
    parsedResult = message;
  }

  return parsedResult;
};

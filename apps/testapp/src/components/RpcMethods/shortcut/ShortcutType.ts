import { SignTypedDataReturnType } from 'viem';
export type ShortcutType = {
  key: string;
  data: Record<string, string> | any;
};

export const parseMessage = (message: string | SignTypedDataReturnType) => {
  if (typeof message === 'string') {
    return JSON.parse(message);
  }

  return message;
};

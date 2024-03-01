import { ADDR_TO_FILL } from './const';
import { ShortcutType } from './ShortcutType';

const ethSendTransactionShortcuts: ShortcutType[] = [
  {
    key: 'Example Tx',
    data: {
      from: ADDR_TO_FILL,
      to: ADDR_TO_FILL,
      value: '0x0',
    },
  },
];

export const sendShortcutsMap = {
  eth_sendTransaction: ethSendTransactionShortcuts,
};

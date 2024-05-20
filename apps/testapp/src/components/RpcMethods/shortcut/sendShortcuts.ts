import { ADDR_TO_FILL } from './const';
import { ShortcutType } from './ShortcutType';

const ethSendTransactionShortcuts: ShortcutType[] = [
  {
    key: 'Example Tx',
    data: {
      from: ADDR_TO_FILL,
      to: '0xd7876e5dbd2da268a35416ba75d0ce154ed949e3',
      value: '0x0',
    },
  },
];

export const sendShortcutsMap = {
  eth_sendTransaction: ethSendTransactionShortcuts,
};

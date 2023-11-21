import { ADDR_TO_FILL } from './const';
import { ShortcutType } from './ShortcutType';

const ethSendTransactionShortcuts: ShortcutType[] = [
  {
    key: 'Example Tx',
    data: {
      from: ADDR_TO_FILL,
      to: ADDR_TO_FILL,
      value: '0x0',
      gasLimit: '0x5208',
      gasPriceInWei: '0x2540be400',
      maxFeePerGas: '0x2540be400',
      maxPriorityFeePerGas: '0x3b9aca00',
    },
  },
];

export const sendShortcutsMap = {
  eth_sendTransaction: ethSendTransactionShortcuts,
};

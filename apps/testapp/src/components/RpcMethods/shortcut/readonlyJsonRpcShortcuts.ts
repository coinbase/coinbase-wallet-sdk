import { ADDR_TO_FILL } from './const';
import { ShortcutType } from './ShortcutType';

const readonlyJsonRpcShortcuts: ShortcutType[] = [
  {
    key: 'Get your address balance',
    data: {
      address: ADDR_TO_FILL,
      blockNumber: 'latest',
    },
  },
];
const getTxnCountShortcuts: ShortcutType[] = [
  {
    key: 'Get number of txns sent from your address',
    data: {
      address: ADDR_TO_FILL,
      blockNumber: 'latest',
    },
  },
];

export const readonlyJsonRpcShortcutsMap = {
  eth_getBalance: readonlyJsonRpcShortcuts,
  eth_getTransactionCount: getTxnCountShortcuts,
};

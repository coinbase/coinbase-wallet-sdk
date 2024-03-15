import { ADDR_TO_FILL } from './const';
import { ShortcutType } from './ShortcutType';

const walletSendTransactionShortcuts: ShortcutType[] = [
  {
    key: 'wallet_sendTransaction',
    data: {
      chainId: '84532',
      sender: ADDR_TO_FILL,
      calls: [],
      capabilities: {
        paymaster: {
          url: 'https://paymaster.base.org',
        },
      },
    },
  },
];

export const walletTxShortcutsMap = {
  wallet_sendTransaction: walletSendTransactionShortcuts,
};

import { ADDR_TO_FILL } from './const';
import { ShortcutType } from './ShortcutType';

const walletSendCallsShortcuts: ShortcutType[] = [
  {
    key: 'wallet_sendCalls',
    data: {
      chainId: '84532',
      from: ADDR_TO_FILL,
      calls: [],
      version: '1',
      capabilities: {
        paymaster: {
          url: 'https://paymaster.base.org',
        },
      },
    },
  },
];

export const walletTxShortcutsMap = {
  wallet_sendCalls: walletSendCallsShortcuts,
};

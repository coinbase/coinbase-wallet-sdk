import { ADDR_TO_FILL, CHAIN_ID_TO_FILL } from './const';
import { ShortcutType } from './ShortcutType';

const walletSendCallsShortcuts: ShortcutType[] = [
  {
    key: 'wallet_sendCalls',
    data: {
      chainId: CHAIN_ID_TO_FILL,
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
  {
    key: 'data_callback',
    data: {
      chainId: CHAIN_ID_TO_FILL,
      from: ADDR_TO_FILL,
      calls: [],
      version: '1',
      capabilities: {
        paymaster: {
          url: 'https://paymaster.base.org',
        },
        dataCallback: {
          requests: [
            {
              type: 'email' as const,
              optional: false,
            },
            {
              type: 'physicalAddress' as const,
              optional: true,
            },
            {
              type: 'phoneNumber' as const,
              optional: false,
            },
            {
              type: 'name' as const,
            },
          ],
        },
      },
    },
  },
];

export const walletTxShortcutsMap = {
  wallet_sendCalls: walletSendCallsShortcuts,
};

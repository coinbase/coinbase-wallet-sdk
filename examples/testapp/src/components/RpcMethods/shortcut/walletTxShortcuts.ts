import { ShortcutType } from './ShortcutType';
import { ADDR_TO_FILL, CHAIN_ID_TO_FILL } from './const';

const walletGetCapabilitiesShortcuts: ShortcutType[] = [
  {
    key: 'wallet_getCapabilities',
    data: {
      address: ADDR_TO_FILL,
    },
  },
];

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
  wallet_getCapabilities: walletGetCapabilitiesShortcuts,
  wallet_sendCalls: walletSendCallsShortcuts,
};

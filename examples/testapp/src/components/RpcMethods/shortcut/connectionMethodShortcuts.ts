import { ShortcutType } from './ShortcutType';

const walletConnectShortcuts: ShortcutType[] = [
  {
    key: 'SIWE',
    data: {
      version: '1',
      capabilities: {
        signInWithEthereum: {
          chainId: 84532,
          nonce: Math.random().toString(36).substring(2, 15),
        },
      },
    },
  },
  {
    key: 'Get App Accounts',
    data: {
      version: '1',
      capabilities: {
        getAppAccounts: {
          chainId: 84532,
        },
      },
    },
  },
];

export const connectionMethodShortcutsMap = {
  wallet_connect: walletConnectShortcuts,
};

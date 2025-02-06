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
];

export const connectionMethodShortcutsMap = {
  wallet_connect: walletConnectShortcuts,
};

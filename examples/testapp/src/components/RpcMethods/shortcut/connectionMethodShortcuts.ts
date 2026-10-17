import { toHex } from 'viem';
import { ShortcutType } from './ShortcutType';

const walletConnectShortcuts: ShortcutType[] = [
  {
    key: 'SIWE',
    data: {
      version: '1',
      capabilities: {
        signInWithEthereum: {
          chainId: toHex(8453),
          nonce: Math.random().toString(36).substring(2, 15),
        },
      },
    },
  },
];

export const connectionMethodShortcutsMap: Record<string, ShortcutType[]> = {
  wallet_connect: walletConnectShortcuts,
};

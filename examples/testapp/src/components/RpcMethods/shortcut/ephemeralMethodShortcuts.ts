import { ShortcutType } from './ShortcutType';

const walletSignEphemeralShortcuts: ShortcutType[] = [
  {
    key: 'wallet_sign',
    data: {
      chainId: '84532',
      calls: [],
      version: '1',
    },
  },
];

export const ephemeralMethodShortcutsMap = {
  wallet_sign: walletSignEphemeralShortcuts,
};

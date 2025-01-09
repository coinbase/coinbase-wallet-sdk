import { ShortcutType } from './ShortcutType';

const walletSendCallsEphemeralShortcuts: ShortcutType[] = [
  {
    key: 'wallet_sendCalls',
    data: {
      chainId: '84532',
      calls: [],
      version: '1',
    },
  },
];

const walletSignEphemeralShortcuts: ShortcutType[] = [
  {
    key: 'wallet_sign',
    data: {
      message: 'Hello, world!',
    },
  },
];

export const ephemeralMethodShortcutsMap = {
  wallet_sendCalls: walletSendCallsEphemeralShortcuts,
  wallet_sign: walletSignEphemeralShortcuts,
};

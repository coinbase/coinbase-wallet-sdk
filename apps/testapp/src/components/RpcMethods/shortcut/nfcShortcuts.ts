import { ShortcutType } from './ShortcutType';

const NfcShortcuts: ShortcutType[] = [
  {
    key: 'Example NFC',
    data: {
      calldata:
        '0x095ea7b3000000000000000000000000b9d5b99d5d0fa04dd7eb2b0cd7753317c2ea1a8400000000000000000000000000000000000000000000000000000000002dc6c0',
    },
  },
];

export const nfcShortcutsMap = {
  requestNFCPayment: NfcShortcuts,
};

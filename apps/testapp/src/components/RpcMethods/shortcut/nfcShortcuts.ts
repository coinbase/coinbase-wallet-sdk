import { ShortcutType } from './ShortcutType';

const NfcShortcuts: ShortcutType[] = [
  {
    key: 'Example NFC',
    data: {
      receiverName: 'Testing Vendor',
      receiverAddress: '0x69bAdF095B03d62e97445EB0142e6488d19fF38B',
      amount: '1',
      chainId: '8453',
      chainAsset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
  },
];

export const nfcShortcutsMap = {
  wallet_requestNFCPayment: NfcShortcuts,
};

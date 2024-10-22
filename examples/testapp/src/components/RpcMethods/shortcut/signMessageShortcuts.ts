import { ADDR_TO_FILL, EXAMPLE_MESSAGE } from './const';
import { ShortcutType } from './ShortcutType';

const personalSignShortcuts: ShortcutType[] = [
  {
    key: EXAMPLE_MESSAGE,
    data: {
      message: EXAMPLE_MESSAGE,
      address: ADDR_TO_FILL,
    },
  },
];

const ethSignTypedDataV1Shortcuts: ShortcutType[] = [
  {
    key: EXAMPLE_MESSAGE,
    data: {
      message: [
        {
          type: 'string',
          name: 'Message',
          value: EXAMPLE_MESSAGE,
        },
      ],
      address: ADDR_TO_FILL,
    },
  },
];

const ethSignTypedDataV3Shortcuts: (chainId) => ShortcutType[] = (chainId: number) => [
  {
    key: EXAMPLE_MESSAGE,
    data: {
      message: {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' },
          ],
          Mail: [
            { name: 'from', type: 'Person' },
            { name: 'to', type: 'Person' },
            { name: 'contents', type: 'string' },
          ],
        },
        primaryType: 'Mail',
        domain: {
          name: 'Ether Mail',
          version: '1',
          chainId,
          verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        },
        message: {
          from: {
            name: 'Cow',
            wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
          },
          to: {
            name: 'Bob',
            wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
          },
          contents: 'Hello, Bob!',
        },
      },
      address: ADDR_TO_FILL,
    },
  },
];

const ethSignTypedDataV4Shortcuts: (chainId: number) => ShortcutType[] = (chainId: number) => [
  {
    key: EXAMPLE_MESSAGE,
    data: {
      message: {
        domain: {
          chainId,
          name: 'Ether Mail',
          verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
          version: '1',
        },
        message: {
          contents: 'Hello, Bob!',
          from: {
            name: 'Cow',
            wallets: [
              '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
              '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
            ],
          },
          to: [
            {
              name: 'Bob',
              wallets: [
                '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
                '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
                '0xB0B0b0b0b0b0B000000000000000000000000000',
              ],
            },
          ],
        },
        primaryType: 'Mail',
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Group: [
            { name: 'name', type: 'string' },
            { name: 'members', type: 'Person[]' },
          ],
          Mail: [
            { name: 'from', type: 'Person' },
            { name: 'to', type: 'Person[]' },
            { name: 'contents', type: 'string' },
          ],
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallets', type: 'address[]' },
          ],
        },
      },
      address: ADDR_TO_FILL,
    },
  },
  {
    key: 'Grant Permission',
    data: {
      message: {
        domain: {
          name: 'Spend Permission Manager',
          version: '1',
          chainId,
          verifyingContract: '0x4ba47ee994d7fd63e8e8029431c35afa8487b8a5',
        },
        types: {
          SpendPermission: [
            { name: 'account', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'start', type: 'uint48' },
            { name: 'end', type: 'uint48' },
            { name: 'period', type: 'uint48' },
            { name: 'allowance', type: 'uint160' },
          ],
        },
        primaryType: 'SpendPermission',
        message: {
          account: '0xd4e17478581878A967aA22d45a5158A9fE96AA08',
          spender: '0x0000000000000000000000000000000000000000',
          token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          end: 17242884802,
          start: 1724264802,
          period: 86400,
          allowance: '10000000000000000',
        },
      },
      address: ADDR_TO_FILL,
    },
  },
];

export const signMessageShortcutsMap = (chainId: number) => ({
  personal_sign: personalSignShortcuts,
  eth_signTypedData_v1: ethSignTypedDataV1Shortcuts,
  eth_signTypedData_v3: ethSignTypedDataV3Shortcuts(chainId),
  eth_signTypedData_v4: ethSignTypedDataV4Shortcuts(chainId),
});

import { ShortcutType } from './ShortcutType';
import { ADDR_TO_FILL, EXAMPLE_MESSAGE } from './const';

const TYPED_DATA_V4_DATA = {
  domain: {
    chainId: '8453',
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
};

const BASE_PAY_DATA = {
  domain: {
    chainId: 8453,
    name: 'USDC',
    verifyingContract: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    version: '2',
  },
  message: {
    from: ADDR_TO_FILL,
    nonce: '0xbda37619d3004dba4ac2491022bc82b7df64c2f68e8a349422c71983a80d16ca',
    to: '0xbc4c0191af73c4953b54f21ae0c74b31fc6cb21b',
    validAfter: '0',
    validBefore: '1914749767655',
    value: '10000',
  },
  primaryType: 'ReceiveWithAuthorization',
  types: {
    ReceiveWithAuthorization: [
      {
        name: 'from',
        type: 'address',
      },
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'validAfter',
        type: 'uint256',
      },
      {
        name: 'validBefore',
        type: 'uint256',
      },
      {
        name: 'nonce',
        type: 'bytes32',
      },
    ],
  },
};

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
      message: TYPED_DATA_V4_DATA,
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
          chainId: Number(chainId),
          verifyingContract: '0xf85210B21cC50302F477BA56686d2019dC9b67Ad',
        },
        types: {
          SpendPermission: [
            { name: 'account', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'allowance', type: 'uint160' },
            { name: 'period', type: 'uint48' },
            { name: 'start', type: 'uint48' },
            { name: 'end', type: 'uint48' },
            { name: 'salt', type: 'uint256' },
            { name: 'extraData', type: 'bytes' },
          ],
        },
        primaryType: 'SpendPermission',
        message: {
          account: 'YOUR_ADDRESS_HERE',
          spender: '0xd4e17478581878A967aA22d45a5158A9fE96AA08',
          token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          allowance: '1000000',
          period: 86400,
          start: 1724264802,
          end: 17242884802,
          salt: '0x1',
          extraData: '0x',
        },
      },
      address: ADDR_TO_FILL,
    },
  },
];

const walletSignOldSpecShortcuts: ShortcutType[] = [
  {
    key: 'Base Pay',
    data: {
      version: '1.0',
      type: '0x01',
      address: ADDR_TO_FILL,
      data: BASE_PAY_DATA,
    },
  },
  {
    key: 'Typed Data',
    data: {
      version: '1.0',
      type: '0x01',
      address: ADDR_TO_FILL,
      data: TYPED_DATA_V4_DATA,
    },
  },
  {
    key: 'Personal Sign',
    data: {
      version: '1.0',
      type: '0x45',
      address: ADDR_TO_FILL,
      data: {
        message: 'Hello, World!',
      },
    },
  },
];

const walletSignNewSpecShortcuts: ShortcutType[] = [
  {
    key: 'Base Pay',
    data: {
      version: '1.0',
      request: {
        type: '0x01',
        data: BASE_PAY_DATA,
      },
      address: ADDR_TO_FILL,
    },
  },
  {
    key: 'Typed Data',
    data: {
      version: '1.0',
      request: {
        type: '0x01',
        data: TYPED_DATA_V4_DATA,
      },
      address: ADDR_TO_FILL,
    },
  },
  {
    key: 'Personal Sign',
    data: {
      version: '1.0',
      request: {
        type: '0x45',
        data: {
          message: 'Hello, World!',
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
  ['wallet_sign#old']: walletSignOldSpecShortcuts,
  ['wallet_sign#new']: walletSignNewSpecShortcuts,
});

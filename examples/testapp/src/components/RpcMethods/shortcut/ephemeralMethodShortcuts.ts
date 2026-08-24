import { ShortcutType } from './ShortcutType';

const PLACEHOLDER_ADDRESS = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const BASE_PAY_DATA = {
  domain: {
    chainId: 8453,
    name: 'USDC',
    verifyingContract: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    version: '2',
  },
  message: {
    from: PLACEHOLDER_ADDRESS,
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

const SUBSCRIPTION_DATA = {
  domain: {
    name: 'Spend Permission Manager',
    version: '1',
    chainId: 8453,
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
    account: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Placeholder
    spender: '0xd4e17478581878A967aA22d45a5158A9fE96AA08',
    token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    allowance: '1000000',
    period: 86400,
    start: 1724264802,
    end: 17242884802,
    salt: '0x1',
    extraData: '0x',
  },
};

const walletSendCallsEphemeralShortcuts: ShortcutType[] = [
  {
    key: 'wallet_sendCalls',
    data: {
      chainId: '8453',
      calls: [],
      version: '1',
    },
  },
];

const walletSignOldSpecEphemeralShortcuts: ShortcutType[] = [
  {
    key: 'Base Pay',
    data: {
      version: '1.0',
      type: '0x01',
      data: BASE_PAY_DATA,
      mutableData: {
        fields: ['message.from'],
      },
    },
  },
  {
    key: 'Subscription',
    data: {
      version: '1.0',
      type: '0x01',
      data: SUBSCRIPTION_DATA,
      mutableData: {
        fields: ['message.account'],
      },
    },
  },
];

const walletSignNewSpecEphemeralShortcuts: ShortcutType[] = [
  {
    key: 'Base Pay',
    data: {
      version: '1.0',
      request: {
        type: '0x01',
        data: BASE_PAY_DATA,
      },
      mutableData: {
        fields: ['message.from'],
      },
    },
  },
  {
    key: 'Subscription',
    data: {
      version: '1.0',
      request: {
        type: '0x01',
        data: SUBSCRIPTION_DATA,
      },
      mutableData: {
        fields: ['message.account'],
      },
    },
  },
];

export const ephemeralMethodShortcutsMap = {
  wallet_sendCalls: walletSendCallsEphemeralShortcuts,
  ['wallet_sign#old']: walletSignOldSpecEphemeralShortcuts,
  ['wallet_sign#new']: walletSignNewSpecEphemeralShortcuts,
};

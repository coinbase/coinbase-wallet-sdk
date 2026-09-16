/**********************************************************************
 * SpendPermissionManager contract constants
 *
 * Moved out of the removed sub-account module: spend permissions are signed
 * through wallet_sign and share nothing else with sub-accounts.
 **********************************************************************/

export const spendPermissionManagerAddress = '0xf85210B21cC50302F477BA56686d2019dC9b67Ad';

export const spendPermissionManagerAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'publicERC6492Validator',
        type: 'address',
        internalType: 'contract PublicERC6492Validator',
      },
      { name: 'magicSpend', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    name: 'MAGIC_SPEND',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'NATIVE_TOKEN',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'PERMISSION_DETAILS_TYPEHASH',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'PUBLIC_ERC6492_VALIDATOR',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract PublicERC6492Validator',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'SPEND_PERMISSION_BATCH_TYPEHASH',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'SPEND_PERMISSION_TYPEHASH',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approveBatchWithSignature',
    inputs: [
      {
        name: 'spendPermissionBatch',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermissionBatch',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          {
            name: 'permissions',
            type: 'tuple[]',
            internalType: 'struct SpendPermissionManager.PermissionDetails[]',
            components: [
              {
                name: 'spender',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'token',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'allowance',
                type: 'uint160',
                internalType: 'uint160',
              },
              {
                name: 'salt',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'extraData',
                type: 'bytes',
                internalType: 'bytes',
              },
            ],
          },
        ],
      },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approveWithRevoke',
    inputs: [
      {
        name: 'permissionToApprove',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: 'permissionToRevoke',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: 'expectedLastUpdatedPeriod',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approveWithSignature',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'eip712Domain',
    inputs: [],
    outputs: [
      { name: 'fields', type: 'bytes1', internalType: 'bytes1' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'version', type: 'string', internalType: 'string' },
      { name: 'chainId', type: 'uint256', internalType: 'uint256' },
      {
        name: 'verifyingContract',
        type: 'address',
        internalType: 'address',
      },
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
      {
        name: 'extensions',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBatchHash',
    inputs: [
      {
        name: 'spendPermissionBatch',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermissionBatch',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          {
            name: 'permissions',
            type: 'tuple[]',
            internalType: 'struct SpendPermissionManager.PermissionDetails[]',
            components: [
              {
                name: 'spender',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'token',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'allowance',
                type: 'uint160',
                internalType: 'uint160',
              },
              {
                name: 'salt',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'extraData',
                type: 'bytes',
                internalType: 'bytes',
              },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurrentPeriod',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getHash',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLastUpdatedPeriod',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isApproved',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isRevoked',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isValid',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'revoke',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revokeAsSpender',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'spend',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      { name: 'value', type: 'uint160', internalType: 'uint160' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'spendWithWithdraw',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      { name: 'value', type: 'uint160', internalType: 'uint160' },
      {
        name: 'withdrawRequest',
        type: 'tuple',
        internalType: 'struct MagicSpend.WithdrawRequest',
        components: [
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
          { name: 'asset', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'expiry', type: 'uint48', internalType: 'uint48' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'SpendPermissionApproved',
    inputs: [
      {
        name: 'hash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'spendPermission',
        type: 'tuple',
        indexed: false,
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SpendPermissionRevoked',
    inputs: [
      {
        name: 'hash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'spendPermission',
        type: 'tuple',
        indexed: false,
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SpendPermissionUsed',
    inputs: [
      {
        name: 'hash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'spender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'periodSpend',
        type: 'tuple',
        indexed: false,
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'AfterSpendPermissionEnd',
    inputs: [
      {
        name: 'currentTimestamp',
        type: 'uint48',
        internalType: 'uint48',
      },
      { name: 'end', type: 'uint48', internalType: 'uint48' },
    ],
  },
  {
    type: 'error',
    name: 'BeforeSpendPermissionStart',
    inputs: [
      {
        name: 'currentTimestamp',
        type: 'uint48',
        internalType: 'uint48',
      },
      { name: 'start', type: 'uint48', internalType: 'uint48' },
    ],
  },
  {
    type: 'error',
    name: 'ERC721TokenNotSupported',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
  },
  { type: 'error', name: 'EmptySpendPermissionBatch', inputs: [] },
  {
    type: 'error',
    name: 'ExceededSpendPermission',
    inputs: [
      { name: 'value', type: 'uint256', internalType: 'uint256' },
      { name: 'allowance', type: 'uint256', internalType: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InvalidLastUpdatedPeriod',
    inputs: [
      {
        name: 'actualLastUpdatedPeriod',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
      {
        name: 'expectedLastUpdatedPeriod',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
  },
  {
    type: 'error',
    name: 'InvalidSender',
    inputs: [
      { name: 'sender', type: 'address', internalType: 'address' },
      { name: 'expected', type: 'address', internalType: 'address' },
    ],
  },
  { type: 'error', name: 'InvalidSignature', inputs: [] },
  {
    type: 'error',
    name: 'InvalidStartEnd',
    inputs: [
      { name: 'start', type: 'uint48', internalType: 'uint48' },
      { name: 'end', type: 'uint48', internalType: 'uint48' },
    ],
  },
  {
    type: 'error',
    name: 'InvalidWithdrawRequestNonce',
    inputs: [
      {
        name: 'noncePostfix',
        type: 'uint128',
        internalType: 'uint128',
      },
      {
        name: 'permissionHashPostfix',
        type: 'uint128',
        internalType: 'uint128',
      },
    ],
  },
  {
    type: 'error',
    name: 'MismatchedAccounts',
    inputs: [
      {
        name: 'firstAccount',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'secondAccount',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'SpendTokenWithdrawAssetMismatch',
    inputs: [
      { name: 'spendToken', type: 'address', internalType: 'address' },
      {
        name: 'withdrawAsset',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'SpendValueOverflow',
    inputs: [{ name: 'value', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'error',
    name: 'SpendValueWithdrawAmountMismatch',
    inputs: [
      { name: 'spendValue', type: 'uint256', internalType: 'uint256' },
      {
        name: 'withdrawAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  { type: 'error', name: 'UnauthorizedSpendPermission', inputs: [] },
  {
    type: 'error',
    name: 'UnexpectedReceiveAmount',
    inputs: [
      { name: 'received', type: 'uint256', internalType: 'uint256' },
      { name: 'expected', type: 'uint256', internalType: 'uint256' },
    ],
  },
  { type: 'error', name: 'ZeroAllowance', inputs: [] },
  { type: 'error', name: 'ZeroPeriod', inputs: [] },
  { type: 'error', name: 'ZeroSpender', inputs: [] },
  { type: 'error', name: 'ZeroToken', inputs: [] },
  { type: 'error', name: 'ZeroValue', inputs: [] },
] as const;

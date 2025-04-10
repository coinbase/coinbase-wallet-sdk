import {
  Address,
  Hex,
  SignableMessage,
  TypedDataDefinition, encodeFunctionData, hexToNumber,
  hexToString,
  http,
  isHex,
  numberToHex
} from 'viem';
import { createPaymasterClient } from 'viem/account-abstraction';
import { getCode } from 'viem/actions';

import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { PrepareCallsParams, type PrepareCallsSchema } from ':core/rpc/wallet_prepareCalls.js';
import {
  SendPreparedCallsParams,
  type SendPreparedCallsSchema,
} from ':core/rpc/wallet_sendPreparedCalls.js';
import { getBundlerClient, getClient } from ':store/chain-clients/utils.js';
import { store } from ':store/store.js';
import { assertArrayPresence, assertPresence } from ':util/assertPresence.js';
import { convertCredentialToJSON } from ':util/encoding.js';
import { get } from ':util/get.js';
import { createSmartAccount } from './createSmartAccount.js';
import { getOwnerIndex } from './getOwnerIndex.js';

const spendPermissionManagerAbi = [
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

export async function createSubAccountSigner({ chainId }: { chainId: number }) {
  const client = getClient(chainId);
  assertPresence(client, standardErrors.rpc.internal(`client not found for chainId ${chainId}`));

  const subAccount = store.subAccounts.get();
  const toSubAccountSigner = store.getState().toSubAccountSigner;
  assertPresence(subAccount, standardErrors.rpc.internal('subaccount not found'));
  assertPresence(toSubAccountSigner, standardErrors.rpc.internal('toSubAccountSigner not defined'));

  const { account: owner } = await toSubAccountSigner();
  assertPresence(owner, standardErrors.rpc.internal('signer not found'));

  const code = await getCode(client, {
    address: subAccount.address,
  });

  // Default index to 1 if the contract is not deployed
  // Note: importing an undeployed contract might need to be handled differently
  // The implemention will likely require the signer to tell us the index
  let index = 1;
  if (code) {
    index = await getOwnerIndex({
      address: subAccount.address,
      publicKey: owner.type === 'local' ? owner.address : owner.publicKey,
      client,
    });
  }

  // If contract is not deployed we need to have the factory data
  if (!code) {
    assertPresence(subAccount.factoryData, standardErrors.rpc.internal('factory data not found'));
  }

  const account = await createSmartAccount({
    owner,
    ownerIndex: index,
    address: subAccount.address,
    client,
    factoryData: subAccount.factoryData,
  });

  const request = async (args: RequestArguments) => {
    switch (args.method) {
      case 'wallet_addSubAccount':
        return subAccount!;
      case 'eth_accounts':
        return [subAccount!.address] as Address[];
      case 'eth_coinbase':
        return subAccount!.address;
      case 'net_version':
        return chainId.toString();
      case 'eth_chainId':
        return numberToHex(chainId);
      case 'eth_sendTransaction': {
        //assertArrayPresence(args.params);
        //return account.sign(args.params[0] as { hash: Hex });
        // this is a hack to make sure we dont run into paymaster issues
        // @ts-ignore
        const paymasterUrl =
          // @ts-ignore
          chainId === 8453 || chainId === '0x2105'
            ? 'https://api.developer.coinbase.com/rpc/v1/base/gfgi5KPiwXGEcCCDFHqJjwq1TIHV9uMP'
            : 'https://api.developer.coinbase.com/rpc/v1/base-sepolia/gfgi5KPiwXGEcCCDFHqJjwq1TIHV9uMP';
        const paymaster = createPaymasterClient({
          transport: http(paymasterUrl),
        });
        const bundlerClient = getBundlerClient(chainId);
        assertPresence(bundlerClient, standardErrors.rpc.invalidParams('bundler client not found'));

        // @ts-ignore
        const params = args.params[0] as {
          to: Address;
          data: Hex;
          value: any;
        };

        let calls;
        const spendPermission = store.getState().spendPermission;
        if (!spendPermission) {
          console.error('no spend permission found');
          calls = [
            {
              to: params.to,
              data: params.data,
              value: params.value,
            },
          ];
        } else {
          calls = [
            {
              to: '0xf85210B21cC50302F477BA56686d2019dC9b67Ad' as Address,
              data: encodeFunctionData({
                abi: spendPermissionManagerAbi,
                functionName: 'approveWithSignature',
                // @ts-ignore
                args: [spendPermission.permission, spendPermission.signature],
              }),
              value: '0x0',
            },
            {
              to: '0xf85210B21cC50302F477BA56686d2019dC9b67Ad' as Address,
              data: encodeFunctionData({
                abi: spendPermissionManagerAbi,
                functionName: 'spend',
                // @ts-ignore
                args: [spendPermission.permission, params.value.toString()],
              }),
              value: '0x0',
            },
            {
              to: params.to,
              data: params.data,
              value: params.value,
            },
          ];
        }
        // Send the user operation
        const result = await bundlerClient.sendUserOperation({
          account,
          calls,
          paymaster,
        });
        const userOpReceipt = await bundlerClient.waitForUserOperationReceipt({
          hash: result,
        });
        return userOpReceipt.receipt.transactionHash;
      }
      case 'wallet_sendCalls': {
        assertArrayPresence(args.params);
        // Get the client for the chain
        const chainId = get(args.params[0], 'chainId');
        if (!chainId) {
          throw standardErrors.rpc.invalidParams('chainId is required');
        }

        if (!isHex(chainId)) {
          throw standardErrors.rpc.invalidParams('chainId must be a hex encoded integer');
        }

        const publicClient = getClient(hexToNumber(chainId));
        assertPresence(
          publicClient,
          standardErrors.rpc.internal(`client not found for chainId ${hexToNumber(chainId)}`)
        );

        if (!args.params[0]) {
          throw standardErrors.rpc.invalidParams('params are required');
        }

        if (!('calls' in args.params[0])) {
          throw standardErrors.rpc.invalidParams('calls are required');
        }

        const prepareCallsResponse = (await request({
          method: 'wallet_prepareCalls',
          params: [
            {
              calls: args.params[0].calls as {
                to: Address;
                data: Hex;
                value: Hex;
              }[],
              chainId: chainId,
              from: subAccount.address,
              capabilities:
                'capabilities' in args.params[0]
                  ? (args.params[0].capabilities as Record<string, any>)
                  : {},
            },
          ],
        })) as PrepareCallsSchema['ReturnType'];

        const signResponse = await owner!.sign?.({
          // Hash returned from wallet_prepareCalls is double hex encoded
          hash: hexToString(prepareCallsResponse.signatureRequest.hash) as `0x${string}`,
        });

        let signatureData: SendPreparedCallsSchema['Parameters'][0]['signature'];

        if (!signResponse) {
          throw standardErrors.rpc.internal('signature not found');
        }

        if (isHex(signResponse)) {
          signatureData = {
            type: 'secp256k1',
            data: {
              address: owner!.address!,
              signature: signResponse as Hex,
            },
          };
        } else {
          signatureData = {
            type: 'webauthn',
            data: {
              signature: JSON.stringify(
                convertCredentialToJSON({
                  id: owner!.id ?? '1',
                  ...signResponse,
                })
              ),
              publicKey: owner!.publicKey,
            },
          };
        }

        const sendPreparedCallsResponse = (await request({
          method: 'wallet_sendPreparedCalls',
          params: [
            {
              version: '1.0',
              type: prepareCallsResponse.type,
              data: prepareCallsResponse.userOp,
              chainId: prepareCallsResponse.chainId,
              signature: signatureData,
            },
          ],
        })) as SendPreparedCallsSchema['ReturnType'];

        return sendPreparedCallsResponse[0];
      }
      case 'wallet_sendPreparedCalls': {
        assertArrayPresence(args.params);
        // Get the client for the chain
        const chainId = get(args.params[0], 'chainId');
        if (!chainId) {
          throw standardErrors.rpc.invalidParams('chainId is required');
        }

        if (!isHex(chainId)) {
          throw standardErrors.rpc.invalidParams('chainId must be a hex encoded integer');
        }

        const publicClient = getClient(hexToNumber(chainId));
        assertPresence(
          publicClient,
          standardErrors.rpc.internal(`client not found for chainId ${hexToNumber(chainId)}`)
        );

        const sendPreparedCallsResponse = await publicClient.request<SendPreparedCallsSchema>({
          method: 'wallet_sendPreparedCalls',
          params: args.params as SendPreparedCallsParams,
        });

        return sendPreparedCallsResponse;
      }
      case 'wallet_prepareCalls': {
        assertArrayPresence(args.params);
        // Get the client for the chain
        const chainId = get(args.params[0], 'chainId');
        if (!chainId) {
          throw standardErrors.rpc.invalidParams('chainId is required');
        }

        if (!isHex(chainId)) {
          throw standardErrors.rpc.invalidParams('chainId must be a hex encoded integer');
        }

        const publicClient = getClient(hexToNumber(chainId));
        assertPresence(
          publicClient,
          standardErrors.rpc.internal(`client not found for chainId ${hexToNumber(chainId)}`)
        );

        if (!args.params[0]) {
          throw standardErrors.rpc.invalidParams('params are required');
        }

        if (!get(args.params[0], 'calls')) {
          throw standardErrors.rpc.invalidParams('calls are required');
        }

        const prepareCallsResponse = await publicClient.request<PrepareCallsSchema>({
          method: 'wallet_prepareCalls',
          params: [{ ...args.params[0], chainId: chainId }] as PrepareCallsParams,
        });

        return prepareCallsResponse;
      }
      case 'personal_sign': {
        assertArrayPresence(args.params);
        return account.signMessage({ message: args.params[0] } as {
          message: SignableMessage;
        });
      }
      case 'eth_signTypedData_v4': {
        assertArrayPresence(args.params);
        return account.signTypedData(args.params[1] as TypedDataDefinition);
      }
      case 'eth_signTypedData_v1':
      case 'eth_signTypedData_v3':
      case 'wallet_addEthereumChain':
      case 'wallet_switchEthereumChain':
      default:
        throw standardErrors.rpc.methodNotSupported();
    }
  };

  return {
    request,
  };
}

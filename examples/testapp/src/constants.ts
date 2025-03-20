export const abi = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    inputs: [{ name: 'owner', type: 'bytes' }],
    name: 'AlreadyOwner',
    type: 'error',
  },
  { inputs: [], name: 'Initialized', type: 'error' },
  {
    inputs: [{ name: 'owner', type: 'bytes' }],
    name: 'InvalidEthereumAddressOwner',
    type: 'error',
  },
  {
    inputs: [{ name: 'key', type: 'uint256' }],
    name: 'InvalidNonceKey',
    type: 'error',
  },
  {
    inputs: [{ name: 'owner', type: 'bytes' }],
    name: 'InvalidOwnerBytesLength',
    type: 'error',
  },
  { inputs: [], name: 'LastOwner', type: 'error' },
  {
    inputs: [{ name: 'index', type: 'uint256' }],
    name: 'NoOwnerAtIndex',
    type: 'error',
  },
  {
    inputs: [{ name: 'ownersRemaining', type: 'uint256' }],
    name: 'NotLastOwner',
    type: 'error',
  },
  {
    inputs: [{ name: 'selector', type: 'bytes4' }],
    name: 'SelectorNotAllowed',
    type: 'error',
  },
  { inputs: [], name: 'Unauthorized', type: 'error' },
  { inputs: [], name: 'UnauthorizedCallContext', type: 'error' },
  { inputs: [], name: 'UpgradeFailed', type: 'error' },
  {
    inputs: [
      { name: 'index', type: 'uint256' },
      { name: 'expectedOwner', type: 'bytes' },
      { name: 'actualOwner', type: 'bytes' },
    ],
    name: 'WrongOwnerAtIndex',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,

        name: 'index',
        type: 'uint256',
      },
      { indexed: false, name: 'owner', type: 'bytes' },
    ],
    name: 'AddOwner',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,

        name: 'index',
        type: 'uint256',
      },
      { indexed: false, name: 'owner', type: 'bytes' },
    ],
    name: 'RemoveOwner',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,

        name: 'implementation',
        type: 'address',
      },
    ],
    name: 'Upgraded',
    type: 'event',
  },
  { stateMutability: 'payable', type: 'fallback' },
  {
    inputs: [],
    name: 'REPLAYABLE_NONCE_KEY',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'addOwnerAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'x', type: 'bytes32' },
      { name: 'y', type: 'bytes32' },
    ],
    name: 'addOwnerPublicKey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'functionSelector', type: 'bytes4' }],
    name: 'canSkipChainIdValidation',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'domainSeparator',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      { name: 'fields', type: 'bytes1' },
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
      { name: 'salt', type: 'bytes32' },
      { name: 'extensions', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'entryPoint',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],

        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'executeBatch',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'calls', type: 'bytes[]' }],
    name: 'executeWithoutChainIdValidation',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { name: 'sender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'initCode', type: 'bytes' },
          { name: 'callData', type: 'bytes' },
          { name: 'callGasLimit', type: 'uint256' },
          {
            name: 'verificationGasLimit',
            type: 'uint256',
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
          },
          { name: 'maxFeePerGas', type: 'uint256' },
          {
            name: 'maxPriorityFeePerGas',
            type: 'uint256',
          },
          { name: 'paymasterAndData', type: 'bytes' },
          { name: 'signature', type: 'bytes' },
        ],

        name: 'userOp',
        type: 'tuple',
      },
    ],
    name: 'getUserOpHashWithoutChainId',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'implementation',
    outputs: [{ name: '$', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owners', type: 'bytes[]' }],
    name: 'initialize',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'isOwnerAddress',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'bytes' }],
    name: 'isOwnerBytes',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'x', type: 'bytes32' },
      { name: 'y', type: 'bytes32' },
    ],
    name: 'isOwnerPublicKey',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'hash', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'isValidSignature',
    outputs: [{ name: 'result', type: 'bytes4' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextOwnerIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'index', type: 'uint256' }],
    name: 'ownerAtIndex',
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'ownerCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'proxiableUUID',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'index', type: 'uint256' },
      { name: 'owner', type: 'bytes' },
    ],
    name: 'removeLastOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'index', type: 'uint256' },
      { name: 'owner', type: 'bytes' },
    ],
    name: 'removeOwnerAtIndex',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'removedOwnersCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'hash', type: 'bytes32' }],
    name: 'replaySafeHash',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'newImplementation', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { name: 'sender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'initCode', type: 'bytes' },
          { name: 'callData', type: 'bytes' },
          { name: 'callGasLimit', type: 'uint256' },
          {
            name: 'verificationGasLimit',
            type: 'uint256',
          },
          {
            name: 'preVerificationGas',
            type: 'uint256',
          },
          { name: 'maxFeePerGas', type: 'uint256' },
          {
            name: 'maxPriorityFeePerGas',
            type: 'uint256',
          },
          { name: 'paymasterAndData', type: 'bytes' },
          { name: 'signature', type: 'bytes' },
        ],

        name: 'userOp',
        type: 'tuple',
      },
      { name: 'userOpHash', type: 'bytes32' },
      { name: 'missingAccountFunds', type: 'uint256' },
    ],
    name: 'validateUserOp',
    outputs: [{ name: 'validationData', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { stateMutability: 'payable', type: 'receive' },
] as const;

export const factoryAbi = [
  {
    inputs: [{ name: 'implementation_', type: 'address' }],
    stateMutability: 'payable',
    type: 'constructor',
  },
  { inputs: [], name: 'OwnerRequired', type: 'error' },
  {
    inputs: [
      { name: 'owners', type: 'bytes[]' },
      { name: 'nonce', type: 'uint256' },
    ],
    name: 'createAccount',
    outputs: [
      {
        name: 'account',
        type: 'address',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owners', type: 'bytes[]' },
      { name: 'nonce', type: 'uint256' },
    ],
    name: 'getAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'implementation',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'initCodeHash',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

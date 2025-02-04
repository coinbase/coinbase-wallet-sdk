import { BaseError, createPublicClient, encodeFunctionData, Hex, http, isAddress, pad } from 'viem';
import { readContract } from 'viem/actions';
import { base } from 'viem/chains';

function isPublicKey(owner: Hex) {
  const addressRegex = /^0x[a-fA-F0-9]{128}$/;
  return addressRegex.test(owner);
}

export async function createAccount(owners: Hex[], nonce: bigint = 0n) {
  const factory = {
    abi: factoryAbi,
    address: '0x0ba5ed0c6aa8c49038f819e587e2633c4a9f428a',
  } as const;

  const ownersBytes = owners.map((owner) => {
    if (isAddress(owner)) return pad(owner);
    if (isPublicKey(owner)) return owner;
    throw new BaseError('invalid owner type');
  });

  const client = createPublicClient({
    chain: base,
    transport: http(),
  });

  const address = await readContract(client, {
    ...factory,
    functionName: 'getAddress',
    args: [ownersBytes, nonce],
  });

  const factoryData = encodeFunctionData({
    abi: factory.abi,
    functionName: 'createAccount',
    args: [ownersBytes, nonce],
  });

  return {
    address,
    factory: factory.address,
    factoryData,
  };
}

/**************************************************************************
 * Constants
 **************************************************************************/
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

import { Client, Hex } from 'viem';
import { readContract } from 'viem/actions';

import { abi } from './constants.js';
import { standardErrors } from ':core/error/errors.js';

export async function getOwnerIndex({
  address,
  client,
  publicKey,
}: {
  address: `0x${string}`;
  client: Client;
  publicKey: Hex;
}): Promise<number> {
  const ownerCount = await readContract(client, {
    address,
    abi,
    functionName: 'ownerCount',
  });

  // Iterate from highest index down and return early when found
  for (let i = Number(ownerCount) - 1; i >= 0; i--) {
    const owner = await readContract(client, {
      address,
      abi,
      functionName: 'ownerAtIndex',
      args: [BigInt(i)],
    });

    if (owner.toLowerCase() === publicKey.toLowerCase()) {
      return i;
    }
  }

  throw standardErrors.rpc.internal('account owner not found');
}
